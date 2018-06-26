import RemoteStore from '../RemoteStore'
import { BLANK_PNG } from '../../b64Assets'
import {
  ACTIONS_NAME,
  DISPATCH_NAME,
  STORE_NAME
} from './AltAccountIdentifiers'
import AltUserIdentifiers from '../User/AltUserIdentifiers'
import SERVICE_TYPES from '../../Models/ACAccounts/ServiceTypes'
import ACMailbox from '../../Models/ACAccounts/ACMailbox'
import CoreACAuth from '../../Models/ACAccounts/CoreACAuth'
import ServiceFactory from '../../Models/ACAccounts/ServiceFactory'
import ACMailboxAvatar from '../../Models/ACAccounts/ACMailboxAvatar'
import CoreACServiceData from '../../Models/ACAccounts/CoreACServiceData'

class CoreAccountStore extends RemoteStore {
  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  constructor () {
    super(DISPATCH_NAME, ACTIONS_NAME, STORE_NAME)

    // Data
    this._mailboxIndex_ = []
    this._mailboxes_ = new Map()
    this._services_ = new Map()
    this._serviceData_ = new Map()
    this._mailboxAuth_ = new Map()
    this._avatars_ = new Map()

    // State
    this._activeServiceId_ = null
    this._sleepingServices_ = new Map()
    this._sleepingMetrics_ = new Map()
    this._mailboxAvatarCache_ = new Map()

    /* ****************************************/
    // Mailboxes
    /* ****************************************/

    /**
    * @return all mailboxes in an array
    */
    this.allMailboxes = () => {
      return this._mailboxIndex_.map((id) => this._mailboxes_.get(id))
    }

    /**
    * @return an object of mailbox id to mailbox
    */
    this.allMailboxesIndexed = () => {
      return this._mailboxIndex_.reduce((acc, id) => {
        acc[id] = this._mailboxes_.get(id)
        return acc
      }, {})
    }

    /**
    * @return an array of mailbox ids
    */
    this.mailboxIds = () => {
      return Array.from(this._mailboxIndex_)
    }

    /**
    * @param id: the id of the mailbox
    * @return the mailbox or null
    */
    this.getMailbox = (id) => {
      return this._mailboxes_.get(id) || null
    }

    /**
    * @return the count of mailboxes
    */
    this.mailboxCount = () => {
      return this._mailboxIndex_.length
    }

    /* ****************************************/
    // Mailbox auth
    /* ****************************************/

    /**
    * @param id: the fully qualified id of the auth object
    * @return the auth object or null
    */
    this.getMailboxAuth = (id) => {
      return this._mailboxAuth_.get(id) || null
    }

    /**
    * @param parentId: the id of the mailbox
    * @param namespace: the namespace of the auth
    * @return the auth object or null
    */
    this.getMailboxAuthForMailbox = (mailboxId, namespace) => {
      if (!namespace) {
        return null
      } else {
        return this._mailboxAuth_.get(CoreACAuth.compositeId(mailboxId, namespace)) || null
      }
    }

    /**
    * @param id: the service id
    * @return the relevant auth object for the service or null
    */
    this.getMailboxAuthForServiceId = (id) => {
      const service = this.getService(id)
      if (!service) { return null }
      return this.getMailboxAuthForMailbox(service.parentId, service.supportedAuthNamespace)
    }

    /**
    * @param mailboxId: the id of the mailbox
    * @return an array of auths that are for that mailbox
    */
    this.getMailboxAuthsForMailbox = (mailboxId) => {
      return Array.from(this._mailboxAuth_.values()).filter((a) => a.parentId === mailboxId)
    }

    /**
    * @param mailboxId: the id of the mailbox
    * @return a list of auth ids assoicated with that mailbox
    */
    this.getMailboxAuthIdsForMailbox = (mailboxId) => {
      return this.getMailboxAuthsForMailbox(mailboxId).map((auth) => auth.id)
    }

    /* ****************************************/
    // Services
    /* ****************************************/

    /**
    * @param id: the service id
    * @return the service or null
    */
    this.getService = (id) => {
      return this._services_.get(id) || null
    }

    /**
    * @param id: the service Id
    * @return true if we have a service of that id, false otherwise
    */
    this.hasService = (id) => {
      return this._services_.has(id)
    }

    /**
    * @return the total count of services
    */
    this.serviceCount = () => {
      return this._services_.size
    }

    /**
    * @return the id of the first service, ordered by the mailbox config
    */
    this.firstServiceId = () => {
      const mailbox = this.allMailboxes().find((mailbox) => !!mailbox.allServices.length)
      if (mailbox) {
        return mailbox.allServices[0]
      } else {
        return null
      }
    }

    /**
    * @param type: the service type
    * @return an array of all the services with the given type
    */
    this.allServicesOfType = (type) => {
      return Array.from(this._services_.values())
        .filter((service) => service.type === type)
    }

    /**
    * @return an array of all services in any order
    */
    this.allServicesUnordered = () => {
      return Array.from(this._services_.values())
    }

    /**
    * @return an array of all services in the order dictated by the mailbox config
    */
    this.allServicesOrdered = () => {
      return this.allMailboxes().reduce((acc, mailbox) => {
        return acc.concat(
          mailbox.allServices().map((serviceId) => this.getService(serviceId))
        )
      }, [])
    }

    /* ****************************************/
    // Service data
    /* ****************************************/

    /**
    * @param id: the id of the service
    * @return the service data or null. Null will only be when the service is undefined
    */
    this.getServiceData = (id) => {
      if (!this._serviceData_.has(id) && this._services_.has(id)) {
        const service = this.getService(id)
        this._serviceData_.set(id, ServiceFactory.modelizeServiceData(
          CoreACServiceData.createJS(id, service.type)
        ))
      }
      return this._serviceData_.get(id) || null
    }

    /**
    * @return the service data for the active service
    */
    this.activeServiceData = () => {
      return this.getServiceData(this.activeServiceId())
    }

    /* ****************************************/
    // Containers
    /* ****************************************/

    /**
    * @return an array of all the container ids
    */
    this.allContainerIds = () => {
      const ids = this.allServicesOfType(SERVICE_TYPES.CONTAINER).map((service) => service.containerId)
      return Array.from(new Set(ids))
    }

    /* ****************************************/
    // Restrictions
    /* ****************************************/

    /**
    * @param id: the service id
    * @return true if this service is restricted ,false otherwise
    */
    this.isServiceRestricted = (id) => {
      if (this.serviceCount() === 0) { return false }

      const user = this.getUser()
      if (user.hasAccountLimit || user.hasAccountTypeRestriction) {
        return !this
          .allServicesOrdered()
          .filter((service) => user.hasAccountsOfType(service.type))
          .slice(0, user.accountLimit)
          .find((service) => service.id === id)
      } else {
        return false
      }
    }

    /**
    * @return an array of services that unrestricted
    */
    this.unrestrictedServices = () => {
      const user = this.getUser()
      if (user.hasAccountLimit || user.hasAccountTypeRestriction) {
        return Array.from(this._services_.values())
          .filter((service) => user.hasAccountsOfType(service.type))
          .slice(0, user.accountLimit)
      } else {
        return Array.from(this._services_.values())
      }
    }

    /**
    * @return an array of service ids that are unrestricted
    */
    this.unrestictedServiceIds = () => {
      const user = this.getUser()
      if (user.hasAccountLimit || user.hasAccountTypeRestriction) {
        return Array.from(this._services_.values())
          .filter((service) => user.hasAccountsOfType(service.type))
          .slice(0, user.accountLimit)
          .map((service) => service.id)
      } else {
        return Array.from(this._services_.keys())
      }
    }

    /**
    * @param mailboxId: the id of the mailbox
    * @return an array of services that are unrestricted for a mailbox
    */
    this.unrestrictedMailboxServiceIds = (mailboxId) => {
      const mailbox = this.getMailbox(mailboxId)
      if (!mailbox) { return [] }

      const user = this.getUser()
      if (user.hasAccountLimit || user.hasAccountTypeRestriction) {
        const unrestrictedServiceSet = new Set(this.unrestictedServiceIds())
        return mailbox.allServices
          .filter((serviceId) => unrestrictedServiceSet.has(serviceId))
      } else {
        return mailbox.allServices
      }
    }

    /* ****************************************/
    // Active
    /* ****************************************/

    /**
    * @return the id of the active service
    */
    this.activeServiceId = () => {
      return this._activeServiceId_ !== null ? this._activeServiceId_ : this.firstServiceId()
    }

    /**
    * @param serviceId: the id of the servie to check
    * @return true if the service is active, false otherwise
    */
    this.isServiceActive = (serviceId) => {
      return this.activeServiceId() === serviceId
    }

    /**
    * @return the active service or null
    */
    this.activeService = () => {
      return this.getService(this.activeServiceId())
    }

    /**
    * @return the id of the active mailbox
    */
    this.activeMailboxId = () => {
      const service = this.activeService()
      return service ? service.parentId : null
    }

    /**
    * @return the active mailbox or null
    */
    this.activeMailbox = () => {
      return this.getMailbox(this.activeMailboxId())
    }

    /* ****************************************/
    // Sleeping
    /* ****************************************/

    /**
    * @param serviceId: the id of the service to check
    * @return true if the service is sleeping, false otherwise
    */
    this.isServiceSleeping = (serviceId) => {
      if (!this.getUser().hasSleepable) { return false }

      if (this._sleepingServices_.has(serviceId)) {
        return this._sleepingServices_.get(serviceId) === true
      } else {
        // If we're not explicitly set to be sleeping/awake use the active state as a great guess
        if (this.isServiceActive(serviceId)) {
          return false
        } else {
          return true
        }
      }
    }

    /**
    * @param mailboxId: the id of the mailbox to check
    * @return true if all services in the mailbox are sleeping, false otherwise
    */
    this.isMailboxSleeping = (mailboxId) => {
      if (!this.getUser().hasSleepable) { return false }

      const mailbox = this.getMailbox(mailboxId)
      if (!mailbox) { return false }

      const awake = mailbox.allServices.find((serviceId) => !this.isServiceSleeping(serviceId))
      return !awake
    }

    /**
    * @param serviceId: the id of the service
    * @return the sleep notification info for the given service or undefined
    */
    this.getSleepingNotificationInfo = (serviceId) => {
      const service = this.getService(serviceId)
      if (!service || service.hasSeenSleepableWizard) { return undefined }

      // As well as checking if we are sleeping, also check we have an entry in the
      // sleep queue. This indicates were not sleeping from launch
      if (!this.isServiceSleeping(serviceId)) { return undefined }

      const metrics = this.sleepingMetrics.get(serviceId)
      if (!metrics) { return undefined }

      // Build the return info
      return {
        service: service,
        closeMetrics: metrics
      }
    }

    /* ****************************************/
    // Avatar
    /* ****************************************/

    /**
    * @param mailboxId: the id of the mailbox
    * @return a ACMailboxAvatar which defines the avatar display config for the mailbox
    */
    this.getMailboxAvatarConfig = (mailboxId) => {
      const mailbox = this.getMailbox(mailboxId)
      const avatarConfig = mailbox ? (
        ACMailboxAvatar.autocreate(mailbox, this._services_, this._avatars_)
      ) : (
        new ACMailboxAvatar({})
      )

      if (this._mailboxAvatarCache_.has(mailboxId)) {
        if (this._mailboxAvatarCache_.get(mailboxId).hashId !== avatarConfig.hashId) {
          this._mailboxAvatarCache_.set(mailboxId, avatarConfig)
        }
      } else {
        this._mailboxAvatarCache_.set(mailboxId, avatarConfig)
      }

      return this._mailboxAvatarCache_.get(mailboxId)
    }

    /**
    * @param mailboxId: the id of the mailbox
    * @param resolver: a function to resolve a partial url
    * @return a resolved avatar for the given mailboxid
    */
    this.getMailboxResolvedAvatar = (mailboxId, resolver) => {
      const mailbox = this.getMailbox(mailboxId)

      let raw
      if (mailbox.hasAvatarId) {
        raw = this._avatars_.get(mailbox.avatarId)
      } else {
        const serviceId = mailbox.allServices.find((serviceId) => {
          const service = this.getService(serviceId)
          if (!service) { return false }
          return service.hasAvatarId || service.hasServiceAvatarURL || service.hasServiceLocalAvatarId
        })
        if (serviceId) {
          const service = this.getService(serviceId)
          if (service.hasAvatarId) {
            raw = this._avatars_.get(service.avatarId)
          } else if (service.hasServiceLocalAvatarId) {
            raw = this._avatars_.get(mailbox.serviceLocalAvatarId)
          } else {
            raw = service.serviceAvatarURL
          }
        }
      }

      return raw ? resolver(raw) : undefined
    }

    /* ****************************************/
    // Unread & tray
    /* ****************************************/

    /**
    * @return the total unread count for the users restriction
    */
    this.userUnreadCount = () => {
      return this.unrestrictedServices().reduce((acc, service) => {
        return acc + this.getServiceData(service.id).getUnreadCount(service)
      }, 0)
    }

    /**
    * @return the total app unread count for the users restriction
    */
    this.userUnreadCountForApp = () => {
      return this.unrestrictedServices().reduce((acc, service) => {
        if (service.showBadgeCountInApp) {
          return acc + this.getServiceData(service.id).getUnreadCount(service)
        } else {
          return acc
        }
      }, 0)
    }

    /**
    * @return true if the users restriction has unread activity on the app
    */
    this.userUnreadActivityForApp = () => {
      return !!this.unrestrictedServices().find((service) => {
        if (service.showUnreadActivityInApp) {
          return this.getServiceData(service.id).getHasUnreadActivity(service)
        } else {
          return false
        }
      })
    }

    /**
    * @param mailboxId: the id of the mailbox to get the unread count for
    * @return the unread count for the given mailbox and user restriction
    */
    this.userUnreadCountForMailbox = (mailboxId) => {
      const mailbox = this.getMailbox(mailboxId)
      if (!mailbox) { return 0 }
      const unrestrictedServiceSet = new Set(this.unrestrictedServices().map((s) => s.id))

      return mailbox.allServices.reduce((acc, serviceId) => {
        if (unrestrictedServiceSet.has(serviceId)) {
          const service = this.getService(serviceId)
          const serviceData = this.getServiceData(serviceId)
          return acc + serviceData.getUnreadCount(service)
        }

        return acc
      }, 0)
    }

    /**
    * @return a list of tray messages for the users restriction
    */
    this.userTrayMessages = () => {
      return this.unrestrictedServices().reduce((acc, service) => {
        return acc.concat(this.getServiceData(service.id).getTrayMessages(service))
      }, [])
    }

    /**
    * @param mailboxId: the id of the mailbox to get the messages for
    * @return a list of tray messages for the mailbox and users restriction
    */
    this.userTrayMessagesForMailbox = (mailboxId) => {
      const mailbox = this.getMailbox(mailboxId)
      if (!mailbox) { return [] }
      const unrestrictedServiceSet = new Set(this.unrestrictedServices().map((s) => s.id))

      return mailbox.allServices.reduce((acc, serviceId) => {
        if (unrestrictedServiceSet.has(serviceId)) {
          const service = this.getService(serviceId)
          const serviceData = this.getServiceData(serviceId)
          return acc.concat(serviceData.getTrayMessages(service))
        }

        return acc
      }, [])
    }

    /* ****************************************/
    // Misc
    /* ****************************************/

    /**
    * @return an array of all partition ids used
    */
    this.allPartitions = () => {
      return Array.from(this._mailboxes_.values()).map((mailbox) => mailbox.partiton)
    }

    /* ****************************************/
    // Actions
    /* ****************************************/

    const actions = this.alt.getActions(ACTIONS_NAME)
    this.bindActions({
      handleLoad: actions.LOAD
    })
  }

  /* **************************************************************************/
  // Utils: UserStore cross linking
  /* **************************************************************************/

  /**
  * Tries to source the user from the user store
  * @return the user or a default representation
  */
  getUser () {
    const userStore = this.alt.getStore(AltUserIdentifiers.STORE_NAME)
    if (userStore) {
      const user = userStore.getState().user
      if (user) {
        return user
      }
    }

    throw new Error(`Alt "${STORE_NAME}" unable to locate "${AltUserIdentifiers.STORE_NAME}". Ensure both have been linked`)
  }

  /**
  * Gets a container from the user store
  * @param containerId: the container
  * @return the container or undefined if it's unknown
  */
  getContainer (containerId) {
    const userStore = this.alt.getStore(AltUserIdentifiers.STORE_NAME)
    if (userStore) {
      return userStore.getState().getContainer(containerId)
    }

    throw new Error(`Alt "${STORE_NAME}" unable to locate "${AltUserIdentifiers.STORE_NAME}". Ensure both have been linked`)
  }

  /* **************************************************************************/
  // Loading
  /* **************************************************************************/

  handleLoad (payload) {
    const {
      mailboxIndex,
      mailboxes,
      services,
      serviceData,
      mailboxAuth,
      avatars,
      activeService,
      sleepingServices
    } = payload

    // Mailboxes
    this._mailboxIndex_ = mailboxIndex
    this._mailboxes_ = Object.keys(mailboxes).reduce((acc, id) => {
      acc.set(id, require("../../Models/UndefinedPropProxy")(new ACMailbox(mailboxes[id])))
      return acc
    }, new Map())
    this._mailboxAuth_ = Object.keys(mailboxAuth).reduce((acc, id) => {
      acc.set(id, new CoreACAuth(mailboxAuth[id]))
      return acc
    }, new Map())

    // Services
    this._services_ = Object.keys(services).reduce((acc, id) => {
      acc.set(id, ServiceFactory.modelizeService(services[id]))
      return acc
    }, new Map())
    this._serviceData_ = Object.keys(serviceData).reduce((acc, id) => {
      acc.set(id, ServiceFactory.modelizeServiceData(serviceData[id]))
      return acc
    }, new Map())

    // Avatars
    this.avatars = Object.keys(avatars).reduce((acc, id) => {
      acc.set(id, avatars[id])
      return acc
    }, new Map())

    // Active & Sleep
    this._activeServiceId_ = activeService
    this._sleepingServices_ = Object.keys(sleepingServices).reduce((acc, k) => {
      acc.set(k, sleepingServices[k])
      return acc
    }, new Map())
  }
}

export default CoreAccountStore