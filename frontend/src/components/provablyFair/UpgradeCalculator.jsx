import React, { useEffect, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { verifyUpgrade } from '../../api/all/upgrade';
import { clientErrorMessage } from '../../helpers/serverMessage';
import { rollPercent } from '../../helpers/upgrade';

const EMPTY_FORM = {
    serverSeed: '', clientSeed: '', nonce: '', chance: '', upgradeId: '',
};

const integerInput = (value, minimum) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= minimum;

const MATCH_FLAGS = [
    ['seedMatches', 'upgradeSeedMatches', 'upgradeSeedMismatch'],
    ['inputsMatchRecord', 'upgradeInputsMatch', 'upgradeInputsMismatch'],
    ['matchesRecord', 'upgradeRecordMatches', 'upgradeRecordMismatch'],
];

const UpgradeCalculator = ({ record }) => {
    const { t, i18n } = useTranslation();
    const [form, setForm] = useState(EMPTY_FORM);
    const [mode, setMode] = useState('chance');
    const [result, setResult] = useState(null);
    const [failure, setFailure] = useState(null);
    const [invalid, setInvalid] = useState(false);
    const [busy, setBusy] = useState(false);
    const generation = useRef(0);
    const pending = useRef(false);

    useEffect(() => {
        if (record) {
            setForm({
                serverSeed: record.revealedServerSeed || '',
                clientSeed: record.clientSeed,
                nonce: String(record.nonce),
                upgradeId: String(record.upgradeId),
                chance: '',
            });
            setMode('record');
        }
        setResult(null);
        setFailure(null);
        setInvalid(false);
        setBusy(false);
        pending.current = false;
        generation.current += 1;
        return () => { generation.current += 1; };
    }, [record]);

    const clearResult = () => {
        setResult(null);
        setFailure(null);
        setInvalid(false);
    };

    const changeField = (name, value) => {
        setForm((previous) => ({ ...previous, [name]: value }));
        clearResult();
    };

    const changeMode = (value) => {
        setMode(value);
        clearResult();
    };

    const compute = async (event) => {
        event.preventDefault();
        if (pending.current) {
            return;
        }
        clearResult();
        const percent = form.chance.trim().replace(',', '.');
        const validChance = /^(?:\d+|\d*\.\d{1,4})$/.test(percent) && Number(percent) >= 0 && Number(percent) <= 100;
        if (!form.serverSeed || form.serverSeed.length > 128 || !form.clientSeed || form.clientSeed.length > 64
            || !integerInput(form.nonce, 0) || (mode === 'chance' ? !validChance : !integerInput(form.upgradeId, 1))) {
            setInvalid(true);
            return;
        }
        const body = { serverSeed: form.serverSeed, clientSeed: form.clientSeed, nonce: Number(form.nonce) };
        if (mode === 'chance') {
            body.threshold = Math.round(Number(percent) * 10000);
        } else {
            body.upgradeId = Number(form.upgradeId);
        }
        const mine = generation.current;
        pending.current = true;
        setBusy(true);
        try {
            const response = await verifyUpgrade(body);
            if (mine === generation.current) {
                setResult(response.data);
            }
        } catch (error) {
            if (mine === generation.current) {
                setFailure(error);
            }
        } finally {
            if (mine === generation.current) {
                pending.current = false;
                setBusy(false);
            }
        }
    };

    return (
        <form className="provablyfair-upgrade-calculator" onSubmit={compute}>
            <p>{t('provablyFair.upgradeAlgorithm')}</p>
            <div className="provablyfair-modes" role="group" aria-label={t('provablyFair.upgradeVerificationMode')}>
                <Button aria-pressed={mode === 'chance'} disabled={busy} onClick={() => changeMode('chance')}>{t('provablyFair.upgradeByChance')}</Button>
                <Button aria-pressed={mode === 'record'} disabled={busy} onClick={() => changeMode('record')}>{t('provablyFair.upgradeById')}</Button>
            </div>
            <div className="provablyfair-upgrade-fields">
                {[
                    ['serverSeed', 'serverSeedPlaceholder', 'text', 128],
                    ['clientSeed', 'clientSeedPlaceholder', 'text', 64],
                    ['nonce', 'nonce', 'numeric', undefined],
                ].map(([name, key, inputMode, maxLength]) => (
                    <label key={name} htmlFor={`upgrade-calc-${name}`}>
                        {t(`provablyFair.${key}`)}
                        <Input id={`upgrade-calc-${name}`} value={form[name]} disabled={busy} inputMode={inputMode} maxLength={maxLength} onChange={(event) => changeField(name, event.target.value)} />
                    </label>
                ))}
                {mode === 'chance' ? (
                    <label htmlFor="upgrade-calc-chance">
                        {t('provablyFair.upgradeChance')}
                        <Input id="upgrade-calc-chance" inputMode="decimal" value={form.chance} disabled={busy} onChange={(event) => changeField('chance', event.target.value)} />
                    </label>
                ) : (
                    <label htmlFor="upgrade-calc-id">
                        {t('provablyFair.upgradeId')}
                        <Input id="upgrade-calc-id" inputMode="numeric" value={form.upgradeId} disabled={busy} onChange={(event) => changeField('upgradeId', event.target.value)} />
                    </label>
                )}
            </div>
            <Button htmlType="submit" disabled={busy} loading={busy} aria-label={t('provablyFair.compute')}>{t('provablyFair.compute')}</Button>
            {(invalid || failure) && (
                <p role="alert" className="provablyfair-error">
                    {invalid ? t('provablyFair.upgradeInvalidInputs') : clientErrorMessage(t, failure) || t('common.serverError')}
                </p>
            )}
            <div aria-live="polite">
                {result && (
                    <>
                        <dl className="provablyfair-upgrade-values">
                            <div><dt>{t('provablyFair.upgradeRoll')}</dt><dd>{rollPercent(result.roll, i18n?.language)}</dd></div>
                            <div><dt>{t('provablyFair.upgradeThreshold')}</dt><dd>{result.threshold ?? t('provablyFair.upgradeNoThreshold')}</dd></div>
                            <div>
                                <dt>{t('provablyFair.result')}</dt>
                                <dd>{result.won === null ? t('provablyFair.upgradeNoThreshold') : t(result.won ? 'provablyFair.upgradeWon' : 'provablyFair.upgradeLost')}</dd>
                            </div>
                        </dl>
                        {MATCH_FLAGS.filter(([flag]) => typeof result[flag] === 'boolean').map(([flag, match, mismatch]) => (
                            <div key={flag} className={result[flag] ? 'provablyfair-ok' : 'provablyfair-error'}>{t(`provablyFair.${result[flag] ? match : mismatch}`)}</div>
                        ))}
                    </>
                )}
            </div>
        </form>
    );
};

export default UpgradeCalculator;
