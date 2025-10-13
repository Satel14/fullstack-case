import React, { Component } from 'react';
import { Input, Tooltip, Radio, Checkbox, Button } from 'antd';
import map from 'lodash/map';
import { getAllCases } from '../api/all/cases';
import Loader from '../components/mini/Loader'
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import H2A from '../components/mini/H2A';
import CaseMini from '../components/mini/CaseMini';
import Flip from 'react-reveal/Flip';

const filteredCases = (categoryId, cases) => cases.filter((item) => item.case_categoryId === categoryId);

const splitTitle = (title, index) => title.split(' ')[index];

export default class Cases extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fetching: false,
            categories: [],
            allCases: [],
            sortedCases: null,
            sortOptions: {
                text: '',
                price: null,
                discount: false,
                resetButton: false,
            },
        };
    }

    componentDidMount() {
        this.mounted = true;

        this.getData();
    }

    getData() {
        this.setState({ fetching: true });

        getAllCases().then((data) => {
           if (this.mounted) {
              this.setState({
                  allCases: data.data,
                  categories: data.categories,
                  fetching: false,
              });
           }
        return null;
        })
        .catch((err) => {
           // eslint-disable-next-line no-console
           console.log('Error', err);
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    setInitialSortOptions() {
        this.setState({
            sortedCases: null,
            sortOptions: {
                text: '',
                price: null,
                discount: false,
                resetButton: false,
            },
        });
    }

    updateSorts() {
        const {allCases, sortOptions} = this.state;
        let newBobi = [];

        let optionCounter = 0;

        if (sortOptions.text !== '') {
            optionCounter += 1;

            const newSortedList = [];
            const textOption = sortOptions.text;

            const sortCaseList = allCases;

            for (const key in sortCaseList) {
                const element = sortCaseList[key];
                const title = element.case_title.toLowerCase();
                const stringFind = textOption.toLowerCase();
                if (title.includes(stringFind)) {
                    newSortedList.push(element);
                }
            }

            newBobi = newSortedList;
        }

        if (sortOptions.price) {
            const newSortedList = [];
            optionCounter += 1;

            let min;
            let max;
            const priceOption = sortOptions.price;

            if (priceOption === 'low') {
                min = 1;
                max = 19;
            } else if (priceOption === 'medium') {
                min = 20;
                max = 49;
            } else if (priceOption === 'high') {
                min = 50;
                max = 99;
            } else if (priceOption === 'superhigh') {
                min = 100;
                max = 1000000;
            }

            const sortCaseList = newBobi.length === 0 && optionCounter === 1 ? allCases : newBobi;
            for (const key in sortCaseList) {
                const element = sortCaseList[key];
                let price = element.case_price;
                if (element.case_discount > 0) {
                    newSortedList.push(element);
                }

                if (price >= min && price <= max) {
                    newSortedList.push(element);
                }
            }
            newBobi = newSortedList;
        }

        if (sortOptions.discount) {
            optionCounter += 1;
            const newSortedList = [];
            const sortCaseList = newBobi.length === 0 && optionCounter === 1 ? allCases : newBobi;

            for (const key in sortCaseList) {
                const element = sortCaseList[key];
                if (element.case_discount > 0) {
                    newSortedList.push(element);
                }
            }
            newBobi = newSortedList;
        }

        if (optionCounter === 0) {
            this.setInitialSortOptions();
            return;
        }

        this.setState({
            sortedCases: newBobi,
            sortOptions: {...sortOptions, resetButton: true }
        })
    }

    onChangeText(e) {
        const {value} = e.target;
        const {sortOptions} = this.state;

        this.setState({
            sortOptions: { ...sortOptions, text: value}
        }, () => this.updateSorts())
    }

    onChangeCheckbox(e) {
        const {checked} = e.target;
        const {sortOptions} = this.state;

        this.setState({
            sortOptions: { ...sortOptions, discount: checked}
        }, () => this.updateSorts())
    }

    onChangeRadio(e) {
        const {value} = e.target;
        const {sortOptions} = this.state;

        this.setState({
            sortOptions: { ...sortOptions, price: value}
        }, () => this.updateSorts())
    }

    onClickRadio(e) {
        const {value} = e.target;
        if(this.state.sortOptions.price === value) {
            const {sortOptions} = this.state;

            this.setState({
                sortOptions: { ...sortOptions, price: ''}
            },
                () => this.updateSorts())
        }
    }

    render() {
        const { fetching, categories, sortedCases, allCases, sortOptions } = this.state;
        return (
            <div className="casepage">
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="casespage sortblock">
                            <Input
                                placeholder="Назва кейсу"
                                prefix={<SearchOutlined/>}
                                onChange={(e) => this.onChangeText(e)}
                            />
                            <Radio.Group
                                buttonStyle="solid"
                                onChange={(e) => this.onChangeRadio(e)}
                                value={sortOptions.price}
                                key="radio-price"
                            >
                                <Radio.Button
                                    value="low"
                                    onClick={(e) => this.onClickRadio(e)}
                                    key="radio-price-1-19"
                                >
                                    1-19₴
                                </Radio.Button>
                                <Radio.Button
                                value="medium"
                                onClick={(e) => this.onClickRadio(e)}
                                key="radio-price-20-49"
                                >
                                    20-49₴
                                </Radio.Button>
                                <Radio.Button
                                value="hight"
                                onClick={(e) => this.onClickRadio(e)}
                                key="radio-price-50-99"
                                >
                                    50-99₴
                                </Radio.Button>
                                <Radio.Button
                                    value="superhight"
                                    onClick={(e) => this.onClickRadio(e)}
                                    key="radio-price-100+"
                                >
                                    100+₴
                                </Radio.Button>
                            </Radio.Group>
                            <Checkbox
                                onChange={(e) => this.onChangeCheckbox(e)}
                                checked={sortOptions.discount}
                            >
                                Тільки зі знижкою
                            </Checkbox>
                            {sortOptions.resetButton && (
                                <Button
                                type="primary"
                                icon={<CloseOutlined/>}
                                className="color-red"
                                onClick={() => this.setInitialSortOptions()}
                                >
                                    Скинути
                                </Button>
                            )}
                        </div>

                        {sortedCases ? (
                            <>
                            <H2A title="Знайдено" subTitle="Кейси" />
                                <div className="caselist">
                                    {map(sortedCases, (item) => (
                                        <div style={{ position: 'relative' }} key={`${`caselist${item.case_id}`}`}>
                                            <CaseMini data={item}/>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                {map(categories, (category) => (
                                    <div key={`categories${category.category_title}`}>
                                        <H2A
                                            title={splitTitle(category.category_title, 0)}
                                            subTitle={splitTitle(category.category_title, 1)}
                                            help={category.category_titleHelp}
                                            />
                                        <div className="caselist">
                                            {map(filteredCases(category.category_id, allCases),
                                                (item, i) => (
                                                    <Flip bottom delay={i * 100} key={`${`caselistfiltered ${item.case_id}`}`}>
                                                        <CaseMini data={item} />
                                                    </Flip>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>
        );
    }
}


// <div className="casepage-openbutton">
//     <OpenCase case={caseCollection} />
// </div>
// <span className="casepage-title-second">
//                     Вміст кейсу
//     {' '}
//     <i>Кількість відкритих: 55</i>
//                 </span>
// <div className="casepage-itemlist">
//     {map(caseCollection.items, (item, i) => (
//         <Fade delay={i * 50}>
//             <Tooltip placement="bottom">
//                 <div
//                     className="casepage-itemlist_item"
//                     style={{
//                         backgroundImage: `url(${item.img})`,
//                     }}
//                 >
//                     <span>{item.name}</span>
//                 </div>
//             </Tooltip>
//         </Fade>
//     ))}
// </div>