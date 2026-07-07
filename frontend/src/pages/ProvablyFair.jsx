import React, { useEffect, useState } from 'react';
import { Modal, Table, Input, Button, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import {
    getProvablyFairState,
    setClientSeed as apiSetClientSeed,
    rotateSeed as apiRotateSeed,
    getOpenHistory,
    verifyOpen,
} from '../api/all/provablyFair';

const ProvablyFair = () => {
    const { t } = useTranslation();
    const [state, setState] = useState(null);
    const [clientSeedInput, setClientSeedInput] = useState('');
    const [history, setHistory] = useState([]);
    const [calc, setCalc] = useState({ serverSeed: '', clientSeed: '', nonce: '', caseId: '' });
    const [calcResult, setCalcResult] = useState(null);
    const [calcError, setCalcError] = useState(null);

    const load = async () => {
        const res = await getProvablyFairState();
        setState(res.data);
        setClientSeedInput(res.data.active.clientSeed);
        const h = await getOpenHistory();
        setHistory(h.data);
    };

    useEffect(() => { load(); }, []);

    const onSaveClientSeed = async () => {
        try {
            await apiSetClientSeed(clientSeedInput);
            await load();
        } catch (e) {
            // error toast is shown by the api layer
        }
    };

    const onRotate = () => {
        Modal.confirm({
            content: t('provablyFair.rotateConfirm'),
            onOk: async () => {
                try {
                    await apiRotateSeed();
                    await load();
                } catch (e) {
                    // error toast is shown by the api layer
                }
            },
        });
    };

    const onCompute = async () => {
        setCalcError(null);
        setCalcResult(null);
        try {
            const res = await verifyOpen({
                serverSeed: calc.serverSeed,
                clientSeed: calc.clientSeed,
                nonce: parseInt(calc.nonce, 10),
                caseId: calc.caseId,
            });
            setCalcResult(res.data);
        } catch (e) {
            setCalcError(t('provablyFair.verifyFailed'));
        }
    };

    const onVerifyRow = (row) => {
        setCalc({
            serverSeed: row.revealedServerSeed || '',
            clientSeed: row.clientSeed,
            nonce: String(row.nonce),
            caseId: row.caseId,
        });
        setCalcResult(null);
    };

    if (!state) return null;

    const columns = [
        { title: t('provablyFair.case'), dataIndex: 'caseId' },
        { title: t('provablyFair.nonce'), dataIndex: 'nonce' },
        { title: t('provablyFair.result'), render: (_, r) => `${r.resultItemId} / ${r.resultColor}` },
        {
            title: t('provablyFair.status'),
            render: (_, r) => (r.revealedServerSeed
                ? <Tag color="green">{t('provablyFair.verifiable')}</Tag>
                : <Tag>{t('provablyFair.awaitingRotate')}</Tag>),
        },
        {
            title: '',
            render: (_, r) => (r.revealedServerSeed
                ? <Button size="small" onClick={() => onVerifyRow(r)}>{t('provablyFair.verify')}</Button>
                : null),
        },
    ];

    return (
        <div className="provablyfairpage">
            <h2>{t('provablyFair.title')}</h2>
            <h3>{t('provablyFair.algorithm')}</h3>
            <p>{t('provablyFair.intro')}</p>
            <p>{t('provablyFair.colorNote')}</p>

            <h3>{t('provablyFair.currentSeeds')}</h3>
            <div>{t('provablyFair.serverSeedHash')}: <code>{state.active.serverSeedHash}</code></div>
            <div>{t('provablyFair.nonce')}: {state.active.nonce}</div>
            <div>
                {t('provablyFair.clientSeed')}:
                <Input value={clientSeedInput} onChange={(e) => setClientSeedInput(e.target.value)} style={{ maxWidth: 320 }} />
                <Button onClick={onSaveClientSeed}>{t('provablyFair.save')}</Button>
            </div>
            <Button danger onClick={onRotate}>{t('provablyFair.rotate')}</Button>
            {state.previous && (
                <div>
                    {t('provablyFair.revealedServerSeed')}: <code>{state.previous.serverSeed}</code>
                    <div className="provablyfair-note">{t('provablyFair.revealedServerSeedNote')}</div>
                </div>
            )}

            <h3>{t('provablyFair.history')}</h3>
            <Table rowKey="id" dataSource={history} columns={columns} pagination={false} />

            <h3>{t('provablyFair.calculator')}</h3>
            <Input placeholder={t('provablyFair.serverSeedPlaceholder')} value={calc.serverSeed} onChange={(e) => setCalc({ ...calc, serverSeed: e.target.value })} />
            <Input placeholder={t('provablyFair.clientSeedPlaceholder')} value={calc.clientSeed} onChange={(e) => setCalc({ ...calc, clientSeed: e.target.value })} />
            <Input placeholder={t('provablyFair.noncePlaceholder')} value={calc.nonce} onChange={(e) => setCalc({ ...calc, nonce: e.target.value })} />
            <Input placeholder={t('provablyFair.caseIdPlaceholder')} value={calc.caseId} onChange={(e) => setCalc({ ...calc, caseId: e.target.value })} />
            <Button onClick={onCompute}>{t('provablyFair.compute')}</Button>
            {calcResult && (
                <div>{t('provablyFair.computed')}: {calcResult.itemId} / {calcResult.color} ({calcResult.rarity})</div>
            )}
            {calcError && <div className="provablyfair-error">{calcError}</div>}
        </div>
    );
};

export default ProvablyFair;
