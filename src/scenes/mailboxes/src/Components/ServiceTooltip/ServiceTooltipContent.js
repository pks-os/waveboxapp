import PropTypes from 'prop-types'
import React from 'react'
import shallowCompare from 'react-addons-shallow-compare'
import { withStyles } from '@material-ui/core/styles'
import { accountStore } from 'stores/account'
import classNames from 'classnames'
import ServiceTooltipHeading from './ServiceTooltipHeading'
import TooltipSectionList from 'wbui/TooltipSectionList'
import ServiceTooltipRecentItem from './ServiceTooltipRecentItem'
import ServiceTooltipBookmarkItem from './ServiceTooltipBookmarkItem'
import TooltipSectionListSubheading from 'wbui/TooltipSectionListSubheading'
import ServiceTooltipInfoItem from './ServiceTooltipInfoItem'
import StarsIcon from '@material-ui/icons/Stars'

const styles = (theme) => ({
  bookmarkHelperIcon: {
    fontSize: '18px',
    verticalAlign: 'text-bottom'
  }
})

@withStyles(styles, { withTheme: true })
class ServiceTooltipContent extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    serviceId: PropTypes.string.isRequired,
    onOpenSettings: PropTypes.func.isRequired,
    onReauthenticate: PropTypes.func.isRequired,
    onOpenRecentItem: PropTypes.func.isRequired,
    onBookmarkRecentItem: PropTypes.func.isRequired,
    onOpenBookmarkItem: PropTypes.func.isRequired,
    onDeleteBookmark: PropTypes.func.isRequired
  }

  /* **************************************************************************/
  // Component lifecycle
  /* **************************************************************************/

  componentDidMount () {
    accountStore.listen(this.accountChanged)
  }

  componentWillUnmount () {
    accountStore.unlisten(this.accountChanged)
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.serviceId !== nextProps.serviceId) {
      this.setState(this.generateServiceState(nextProps.serviceId))
    }
  }

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  state = (() => {
    return {
      ...this.generateServiceState(this.props.serviceId)
    }
  })()

  accountChanged = (accountState) => {
    this.setState(this.generateServiceState(this.props.serviceId, accountState))
  }

  /**
  * @param serviceId: the id of the service
  * @param accountState=autoget: the current account state
  * @return state object
  */
  generateServiceState (serviceId, accountState = accountStore.getState()) {
    const mailbox = accountState.getMailboxForService(serviceId)
    const service = accountState.getService(serviceId)
    const serviceData = accountState.getServiceData(serviceId)

    return mailbox && service && serviceData ? {
      hasMembers: true,
      recent: serviceData.recent,
      bookmarks: service.bookmarks,
      readingQueue: service.readingQueue
    } : {
      hasMembers: false
    }
  }

  /* **************************************************************************/
  // UI Actions
  /* **************************************************************************/

  handleSuppressContextMenu = (evt) => {
    evt.preventDefault()
    evt.stopPropagation()
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  render () {
    const {
      serviceId,
      classes,
      theme,
      className,
      children,
      onContextMenu,
      onOpenSettings,
      onReauthenticate,
      onOpenRecentItem,
      onBookmarkRecentItem,
      onOpenBookmarkItem,
      onDeleteBookmark,
      ...passProps
    } = this.props
    const {
      hasMembers,
      recent,
      bookmarks,
      readingQueue
    } = this.state
    if (!hasMembers) { return false }

    return (
      <div
        className={classNames(className, classes.root)}
        onContextMenu={this.handleSuppressContextMenu}
        {...passProps}>
        <ServiceTooltipHeading
          serviceId={serviceId}
          onOpenSettings={onOpenSettings}
          onReauthenticate={onReauthenticate} />
        <TooltipSectionList style={{ maxHeight: window.outerHeight - 150 }}>
          {/* Bookmarks (used) */}
          {bookmarks.length ? (
            <TooltipSectionListSubheading>Bookmarks</TooltipSectionListSubheading>
          ) : undefined}
          {bookmarks.length ? (
            bookmarks.map((bookmarkItem) => {
              return (
                <ServiceTooltipBookmarkItem
                  key={bookmarkItem.id}
                  serviceId={serviceId}
                  bookmark={bookmarkItem}
                  onOpenBookmark={onOpenBookmarkItem}
                  onDeleteBookmark={onDeleteBookmark} />
              )
            })
          ) : undefined}

          {/* Recents */}
          <TooltipSectionListSubheading>Recent</TooltipSectionListSubheading>
          {recent.length ? (
            recent.map((recentItem) => {
              return (
                <ServiceTooltipRecentItem
                  key={recentItem.id}
                  serviceId={serviceId}
                  recentItem={recentItem}
                  onOpenRecentItem={onOpenRecentItem}
                  onBookmarkRecentItem={onBookmarkRecentItem} />
              )
            })
          ) : (
            <ServiceTooltipInfoItem>
              No recent items
            </ServiceTooltipInfoItem>
          )}

          {/* Bookmarks (unused) */}
          {!bookmarks.length ? (
            <TooltipSectionListSubheading>Bookmarks</TooltipSectionListSubheading>
          ) : undefined}
          {!bookmarks.length ? (
            <ServiceTooltipInfoItem>
              <span>
                <StarsIcon className={classes.bookmarkHelperIcon} /> Bookmark recent items to save them for later
              </span>
            </ServiceTooltipInfoItem>
          ) : undefined}

          {/* Reading queue */}
          <TooltipSectionListSubheading>Queue</TooltipSectionListSubheading>
          {readingQueue.length ? (
            <div />
          ) : (
            <ServiceTooltipInfoItem>
              <div>
                <div>Use the right-click menu to save links into your reading queue</div>
                <div>Once you've read the item it will be removed</div>
              </div>
            </ServiceTooltipInfoItem>
          )}
        </TooltipSectionList>
      </div>
    )
  }
}

export default ServiceTooltipContent