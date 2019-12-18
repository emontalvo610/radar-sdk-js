import * as Cookie from './cookie';
import * as Device from './device';
import * as Http from './http';
import PLACES_PROVIDER from './places_providers';
import SDK_VERSION from './version';
import STATUS from './status_codes';

const DEFAULT_HOST = 'https://api.radar.io';

class Radar {
  static get VERSION() {
    return SDK_VERSION;
  }

  static get PLACES_PROVIDER() {
    return PLACES_PROVIDER;
  }

  static get STATUS() {
    return STATUS;
  }

  static initialize(publishableKey) {
    if (!publishableKey) {
      console.error('Radar "initialize" was called without a publishable key');
    }
    Cookie.setCookie(Cookie.PUBLISHABLE_KEY, publishableKey);
  }

  static setHost(host) {
    Cookie.setCookie(Cookie.HOST, host, true);
  }

  static setPlacesProvider(placesProvider) {
    if (placesProvider !== PLACES_PROVIDER.FACEBOOK) {
      placesProvider = PLACES_PROVIDER.NONE;
    }
    Cookie.setCookie(Cookie.PLACES_PROVIDER, placesProvider);
  }

  static setUserId(userId) {
    if (!userId) {
      Cookie.deleteCookie(Cookie.USER_ID);
      return;
    }

    userId = String(userId).trim();
    if (userId.length === 0 || userId.length > 256) {
      Cookie.deleteCookie(Cookie.USER_ID);
      return;
    }
    Cookie.setCookie(Cookie.USER_ID, userId);
  }

  static setDescription(description) {
    if (!description) {
      Cookie.deleteCookie(Cookie.DESCRIPTION);
      return;
    }

    description = String(description).trim();
    if (description.length === 0 || description.length > 256) {
      Cookie.deleteCookie(Cookie.DESCRIPTION);
      return;
    }
    Cookie.setCookie(Cookie.DESCRIPTION, description);
  }

  static trackOnce(callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) {
        callback(STATUS.ERROR_PUBLISHABLE_KEY);
      }
      return;
    }

    if (!navigator || !navigator.geolocation) {
      if (callback) {
        callback(STATUS.ERROR_LOCATION);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      /* on getCurrentPosition success */
      (position) => {
        if (!position || !position.coords) {
          if (callback) {
            callback(STATUS.ERROR_LOCATION);
          }
          return;
        }

        // Get location data
        const { accuracy, latitude, longitude } = position.coords;

        // Get user data
        const deviceId = Device.getId();
        const userId = Cookie.getCookie(Cookie.USER_ID);
        const placesProvider = Cookie.getCookie(Cookie.PLACES_PROVIDER);
        const description = Cookie.getCookie(Cookie.DESCRIPTION);
        const _id = userId || deviceId;

        // Setup http
        const headers = {
          Authorization: publishableKey
        };

        const body = {
          accuracy,
          description,
          deviceId,
          deviceType: 'Web',
          foreground: true,
          latitude,
          longitude,
          placesProvider,
          sdkVersion: SDK_VERSION,
          stopped: true,
          userAgent: navigator.userAgent,
          userId,
        };

        const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
        const url = `${host}/v1/users/${_id}`;
        const method = 'PUT';

        const onSuccess = (response) => {
          try {
            response = JSON.parse(response);
            if (callback) {
              callback(STATUS.SUCCESS, position.coords, response.user, response.events);
            }
          } catch (e) {
            if (callback) {
              callback(STATUS.ERROR_SERVER);
            }
          }
        };

        const onError = (error) => {
          if (callback) {
            callback(error);
          }
        };

        Http.request(method, url, body, headers, onSuccess, onError);
      },

      /* on getCurrentPosition error */
      (err) => {
        if (callback) {
          if (err && err.code) {
            if (err.code === 1) {
              callback(STATUS.ERROR_PERMISSIONS);
            } else {
              callback(STATUS.ERROR_LOCATION);
            }
          }
        }
      }
    );
  }

  static searchPlaces(latitude, longitude, radius, chains, categories, groups, limit, callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) callback(STATUS.ERROR_PUBLISHABLE_KEY);

      return;
    }

    const finalLimit = Math.min(limit, 100);
    const qs = `latitude=${latitude}&longitude=${longitude}&radius=${radius}&limit=${finalLimit}`;
    if (chains && chains.length > 0) {
      qs = qs.concat(`&chains=${chains.join(',')}`);
    }
    if (categories && categories.length > 0) {
      qs = qs.concat(`&categories=${categories.join(',')}`);
    }
    if (groups && groups.length > 0) {
      qs = qs.concat(`&groups=${groups.join(',')}`);
    }

    const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
    const url = `${host}/v1/places/search?${qs}`;
    const method = 'GET';
    const headers = {
      Authorization: publishableKey,
      'X-Radar-SDK-Version': SDK_VERSION,
      'X-Radar-Device-Type': 'Web',
    };

    const onSuccess = (response) => {
      try {
        response = JSON.parse(response);

        if (callback) callback(STATUS.SUCCESS, response, response.places);
      } catch (e) {
        if (callback) callback(STATUS.ERROR_SERVER);
      }
    };

    const onError = (error) => {
      if (callback) callback(error);
    };

    Http.request(method, url, {}, headers, onSuccess, onError);
  }

  static searchGeofences(latitude, longitude, radius, tags, limit, callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) callback(STATUS.ERROR_PUBLISHABLE_KEY);

      return;
    }

    const finalLimit = Math.min(limit, 100);
    const qs = `latitude=${latitude}&longitude=${longitude}&limit=${limit}`;
    if (tags && tags.length > 0) {
      qs = qs.concat(`&tags=${tags.join(',')}`);
    }

    const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
    const url = `${host}/v1/geofences/search?${qs}`;
    const method = 'GET';
    const headers = {
      Authorization: publishableKey,
      'X-Radar-SDK-Version': SDK_VERSION,
      'X-Radar-Device-Type': 'Web'
    };

    const onSuccess = (response) => {
      try {
        response = JSON.parse(response);

        if (callback) callback(STATUS.SUCCESS, response, response.geofences);
      } catch (e) {
        if (callback) callback(STATUS.ERROR_SERVER);
      }
    };

    const onError = (error) => {
      if (callback) callback(error);
    };

    Http.request(method, url, {}, headers, onSuccess, onError);
  }

  static geocode(query, callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) callback(STATUS.ERROR_PUBLISHABLE_KEY);

      return;
    }

    const qs = `query=${query}`;

    const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
    const url = `${host}/v1/geocode/forward?${qs}`;
    const method = 'GET';
    const headers = {
      Authorization: publishableKey,
      'X-Radar-SDK-Version': SDK_VERSION,
      'X-Radar-Device-Type': 'Web',
    };

    const onSuccess = (response) => {
      try {
        response = JSON.parse(response);

        if (callback) callback(STATUS.SUCCESS, response, response.addresses);
      } catch (e) {
        if (callback) callback(STATUS.ERROR_SERVER);
      }
    };

    const onError = (error) => {
      if (callback) callback(error);
    };

    Http.request(method, url, {}, headers, onSuccess, onError);
  }

  static reverseGeocode(latitude, longitude, callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) callback(STATUS.ERROR_PUBLISHABLE_KEY);

      return;
    }

    const qs = `latitude=${latitude}&longitude=${longitude}`;

    const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
    const url = `${host}/v1/geocode/reverse?${qs}`;
    const method = 'GET';
    const headers = {
      Authorization: publishableKey,
      'X-Radar-SDK-Version': SDK_VERSION,
      'X-Radar-Device-Type': 'Web',
    };

    const onSuccess = (response) => {
      try {
        response = JSON.parse(response);

        if (callback) callback(STATUS.SUCCESS, response, response.addresses);
      } catch (e) {
        if (callback) callback(STATUS.ERROR_SERVER);
      }
    };

    const onError = (error) => {
      if (callback) callback(error);
    };

    Http.request(method, url, {}, headers, onSuccess, onError);
  }

  static ipGeocode(callback) {
    const publishableKey = Cookie.getCookie(Cookie.PUBLISHABLE_KEY);

    if (!publishableKey) {
      if (callback) callback(STATUS.ERROR_PUBLISHABLE_KEY);

      return;
    }

    const host = Cookie.getCookie(Cookie.HOST) || DEFAULT_HOST;
    const url = `${host}/v1/geocode/ip`;
    const method = 'GET';
    const headers = {
      Authorization: publishableKey,
      'X-Radar-SDK-Version': SDK_VERSION,
      'X-Radar-Device-Type': 'Web',
    }

    const onSuccess = (response) => {
      try {
        response = JSON.parse(response);

        if (callback) callback(STATUS.SUCCESS, response, response.regions);
      } catch (e) {
        if (callback) callback(STATUS.ERROR_SERVER);
      }
    }

    const onError = (error) => {
      if (callback) callback(error);
    };

    Http.request(method, url, {}, headers, onSuccess, onError);
  }
}

export default Radar;
