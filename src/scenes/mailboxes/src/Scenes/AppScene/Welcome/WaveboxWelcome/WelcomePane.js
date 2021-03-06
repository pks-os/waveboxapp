import React from 'react'
import { userStore, userActions } from 'stores/user'
import { withStyles } from '@material-ui/core/styles'
import { Button, IconButton, Tooltip } from '@material-ui/core'
import WaveboxSigninButton from 'wbui/SigninButtons/WaveboxSigninButton'
import GoogleSigninButton from 'wbui/SigninButtons/GoogleSigninButton'
import MicrosoftSigninButton from 'wbui/SigninButtons/MicrosoftSigninButton'
import AddCircleIcon from '@material-ui/icons/AddCircle'
import WelcomePanel from '../Common/WelcomePanel'
import WelcomePanelGrid from '../Common/WelcomePanelGrid'
import WelcomePanelGridCell from '../Common/WelcomePanelGridCell'
import WelcomePanelGridVR from '../Common/WelcomePanelGridVR'

const styles = {
  h1: {
    marginTop: 0,
    color: '#00B5F3'
  },
  subh: {
    color: '#A6ABA9',
    marginBottom: 40
  },
  subLoggedIn: {
    fontSize: 14,
    margin: 0
  },

  // Wb signin
  waveboxSignin: {
    marginBottom: 40
  },
  fullWidthButton: {
    margin: 6,
    width: '100%'
  },

  // Add
  addButton: {
    width: 200,
    height: 200
  },
  addButtonIcon: {
    color: '#36D3A2',
    width: 180,
    height: 180
  }
}

@withStyles(styles)
class WelcomePane extends React.Component {
  /* **************************************************************************/
  // Component Lifecycle
  /* **************************************************************************/

  componentDidMount () {
    userStore.listen(this.userChanged)
  }

  componentWillUnmount () {
    userStore.unlisten(this.userChanged)
  }

  /* **************************************************************************/
  // Data Lifecycle
  /* **************************************************************************/

  state = (() => {
    return {
      user: userStore.getState().user
    }
  })()

  userChanged = (userState) => {
    this.setState({ user: userState.user })
  }

  /* **************************************************************************/
  // UI Events
  /* **************************************************************************/

  handleOpenAddWizard = () => {
    window.location.hash = '/mailbox_wizard/add'
  }

  handleLoginGoogle = () => {
    userActions.authenticateWithGoogle({}, false)
  }

  handleLoginMicrosoft = () => {
    userActions.authenticateWithMicrosoft({}, false)
  }

  handleLoginWavebox = () => {
    userActions.authenticateWithWavebox({}, false)
  }

  handleCreateWavebox = () => {
    userActions.createWaveboxAccount({}, false)
  }

  handleWaveboxPasswordReset = () => {
    userActions.passwordResetWaveboxAccount({}, false)
  }

  handleOpenWaveboxAccount = () => {
    window.location.hash = '/settings/pro'
  }

  handleRestoreWaveboxAccount = () => {
    userActions.fetchUserProfiles()
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  /**
  * Renders the account grid item
  * @param classes: the classes to use
  * @param user: the user object to render from
  * @return jsx
  */
  renderAccountGridItem (classes, user) {
    if (user.isLoggedIn) {
      if (user.enableProfileSync) {
        return (
          <WelcomePanelGridCell>
            <h1 className={classes.h1}>Restore your Wavebox</h1>
            <p className={classes.subLoggedIn}>{`Logged in as ${user.userEmail}`}</p>
            <p className={classes.subh}>
              Restoring a profile from another machine will bring most of your configuration
              to this machine and is a fast way to get up and running
            </p>
            <Button
              variant='outlined'
              size='large'
              color='primary'
              className={classes.fullWidthButton}
              onClick={this.handleRestoreWaveboxAccount}>
              Restore profile
            </Button>
            <Button
              variant='outlined'
              size='large'
              className={classes.fullWidthButton}
              onClick={this.handleOpenWaveboxAccount}>
              Wavebox Account
            </Button>
          </WelcomePanelGridCell>
        )
      } else {
        return (
          <WelcomePanelGridCell>
            <h1 className={classes.h1}>Your Wavebox</h1>
            <p className={classes.subLoggedIn}>{`Logged in as ${user.userEmail}`}</p>
            <p className={classes.subh}>
              Manage your Wavebox Account and subscription settings to get the most
              out of Wavebox
            </p>
            <Button
              variant='outlined'
              size='large'
              color='primary'
              className={classes.fullWidthButton}
              onClick={this.handleOpenWaveboxAccount}>
              Wavebox Account
            </Button>
          </WelcomePanelGridCell>
        )
      }
    } else {
      return (
        <WelcomePanelGridCell>
          <h1 className={classes.h1}>Login to Wavebox</h1>
          <p className={classes.subh}>Already have a Wavebox account or part of a team?</p>
          <div className={classes.waveboxSignin}>
            <WaveboxSigninButton
              className={classes.fullWidthButton}
              onClick={this.handleLoginWavebox} />
            <div className={classes.waveboxSigninExtra}>
              <Button
                color='primary'
                onClick={this.handleWaveboxPasswordReset}>
                Forgotten password
              </Button>
              <Button
                color='primary'
                onClick={this.handleCreateWavebox}>
                Create an account
              </Button>
            </div>
          </div>
          <div>
            <GoogleSigninButton
              className={classes.fullWidthButton}
              onClick={this.handleLoginGoogle} />
            <MicrosoftSigninButton
              className={classes.fullWidthButton}
              onClick={this.handleLoginMicrosoft} />
          </div>
        </WelcomePanelGridCell>
      )
    }
  }

  /**
  * Renders the add grid item
  * @param classes: the classes to use
  * @return jsx
  */
  renderAddGridItem (classes) {
    return (
      <WelcomePanelGridCell>
        <h1 className={classes.h1}>Add First App</h1>
        <p className={classes.subh}>Go straight to our App Directory of over 1000 cloud services.</p>
        <Tooltip title='Add your first App'>
          <IconButton className={classes.addButton} onClick={this.handleOpenAddWizard}>
            <AddCircleIcon className={classes.addButtonIcon} />
          </IconButton>
        </Tooltip>
      </WelcomePanelGridCell>
    )
  }

  render () {
    const { user } = this.state
    const { classes, ...passProps } = this.props

    return (
      <WelcomePanel {...passProps}>
        <WelcomePanelGrid>
          {this.renderAccountGridItem(classes, user)}
          <WelcomePanelGridVR color='#A6ABA9' backgroundColor='#FFFFFF'>
            OR
          </WelcomePanelGridVR>
          {this.renderAddGridItem(classes)}
        </WelcomePanelGrid>
      </WelcomePanel>
    )
  }
}

export default WelcomePane
