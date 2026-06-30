const EVENT_NAME = 'app:data-changed';

export const notifyDataChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const onDataChanged = (callback: () => void) => {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
};
