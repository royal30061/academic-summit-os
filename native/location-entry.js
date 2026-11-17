
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const isNative = Capacitor.isNativePlatform();

let nextId = 1;
const watches = new Map();

async function ensurePermission() {
  let permission = await Geolocation.checkPermissions();

  if (permission.location !== 'granted') {
    permission = await Geolocation.requestPermissions();
  }

  if (permission.location !== 'granted') {
    throw new Error('Location permission was not granted.');
  }
}

function locationOptions(options = {}) {
  return {
    enableHighAccuracy: true,
    timeout: options.timeout || 45000,
    maximumAge: 0,
    enableLocationFallback: true
  };
}

const ASGeo = {

  isNative,

  getCurrentPosition(success, error, options = {}) {

    if (!isNative) {
      return navigator.geolocation.getCurrentPosition(
        success, error, options
      );
    }

    ensurePermission()
      .then(() =>
        Geolocation.getCurrentPosition(
          locationOptions(options)
        )
      )
      .then(success)
      .catch(err => {
        if (error) error(err);
      });
  },

  watchPosition(success, error, options = {}) {

    if (!isNative) {
      return navigator.geolocation.watchPosition(
        success, error, options
      );
    }

    const localId = nextId++;

    const state = {
      nativeId: null,
      cancelled: false
    };

    watches.set(localId, state);

    ensurePermission()
      .then(() =>
        Geolocation.watchPosition(
          locationOptions(options),
          (position, err) => {

            if (state.cancelled) return;

            if (err) {
              if (error) error(err);
              return;
            }

            if (position) success(position);
          }
        )
      )
      .then(nativeId => {

        state.nativeId = nativeId;

        if (state.cancelled) {
          Geolocation.clearWatch({ id: nativeId });
        }

      })
      .catch(err => {
        if (error) error(err);
      });

    return localId;
  },

  clearWatch(id) {

    if (!isNative) {
      return navigator.geolocation.clearWatch(id);
    }

    const state = watches.get(id);

    if (!state) return;

    state.cancelled = true;
    watches.delete(id);

    if (state.nativeId) {
      Geolocation.clearWatch({
        id: state.nativeId
      });
    }
  }
};

window.ASGeo = ASGeo;

