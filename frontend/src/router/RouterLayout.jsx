import React, { Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import routes from './routes';
import AppSwitch from './AppSwitch';
import Layout from '../Layout.jsx';
import { isAuthorized } from '../helpers/Player';
import Banned from '../components/Banned';
import ErrorPage from '../pages/ErrorPage';
import { getProfileFetch } from '../store/actions/user';
import roles from '../enum/role';
import { getAllModules } from '../store/actions/module';

const mapDispatchToProps = (dispatch) => ({
    getProfileFetch: () => dispatch(getProfileFetch()),
    getAllModules: () => dispatch(getAllModules()),
});

const mapStateToProps = (state) => ({
    user: state.user,
    modules: state.modules,
});

class RouterLayout extends Component {
    constructor(props) {
        super(props);
        this.state = { sessionChecked: false };
    }

    async componentDidMount() {
        await this.props.getAllModules().catch((error) => console.error('Error fetching modules:', error));
        await Promise.resolve(this.props.getProfileFetch()).catch((error) => console.error('Error fetching profile:', error));
        this.setState({ sessionChecked: true });
    }

    render() {
        const { user } = this.props;
        const { sessionChecked } = this.state;
        if (isAuthorized(user)) {
            if (roles.BANNED === user.role) {
                return <Banned />;
            }
        }
        return (
            <BrowserRouter>
                <Layout>
                    <AppSwitch routes={routes} user={user} sessionChecked={sessionChecked} fallback={ErrorPage} />
                </Layout>
            </BrowserRouter>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RouterLayout);
