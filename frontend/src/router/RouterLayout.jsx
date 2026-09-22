import React, { Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import routes from './routes';
import AppSwitch from './AppSwitch';
import Layout from '../Layout.jsx';
import { connect } from 'react-redux';
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
        this.state = {
            intervalId: null,
        };
    }

    async componentDidMount() {
        try {
            await this.props.getAllModules();
            this.updateOnline();
            await this.props.getProfileFetch();
        } catch (error) {
            console.error('Error fetching modules or profile:', error);
        }
    }


    updateOnline() {
        const { user } = this.props;
        if (isAuthorized(user)) {
            console.log('profileIsOnline');
        }
    }

    render() {

        const { user } = this.props;
        if (isAuthorized(user)) {
            if (roles.BANNED === user.role) {
                return <Banned/>;
            }
        }
        return (
            <BrowserRouter>
                <Layout>
                    <AppSwitch routes={routes} user={user} fallback={ErrorPage}/>
                </Layout>
            </BrowserRouter>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RouterLayout);
