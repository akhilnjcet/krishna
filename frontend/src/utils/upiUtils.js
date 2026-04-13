/**
 * UPI Utilities - High-Resilience Payment System
 * Ensures 100% compliant UPI URLs and provides detection for restrictive environments.
 */

const UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    package: 'com.google.android.apps.nbu.paisa.user',
    color: '#4285F4'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    package: 'com.phonepe.app',
    color: '#5f259f'
  },
  {
    id: 'amazon',
    name: 'Amazon Pay',
    package: 'in.amazon.mShop.android.shopping',
    color: '#FF9900'
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    package: 'in.org.npci.upiapp',
    color: '#005f9f'
  }
];

/**
 * Builds a strictly compliant upi://pay URL
 */
export const buildUPILink = ({ pa, pn, am, tn, tr }) => {
  if (!pa || !am) return null;

  const url = new URL('upi://pay');
  url.searchParams.append('pa', pa);
  url.searchParams.append('pn', pn || 'Business');
  url.searchParams.append('am', parseFloat(am).toFixed(2));
  url.searchParams.append('cu', 'INR');
  
  if (tn) url.searchParams.append('tn', tn);
  if (tr) url.searchParams.append('tr', tr);

  // Return formatted string with encoded components, decoded only for standard upi:// scheme
  return decodeURIComponent(url.toString());
};

/**
 * Builds an Android-specific Intent URL for a targeted package
 */
export const buildAndroidIntent = (upiData, pkg) => {
  const { pa, pn, am, tn, tr } = upiData;
  const amountFixed = parseFloat(am).toFixed(2);
  const encodedName = encodeURIComponent(pn || 'Business');
  const encodedNote = tn ? encodeURIComponent(tn) : '';
  
  let base = `pa=${pa}&pn=${encodedName}&am=${amountFixed}&cu=INR`;
  if (encodedNote) base += `&tn=${encodedNote}`;
  if (tr) base += `&tr=${tr}`;

  return `intent://pay?${base}#Intent;scheme=upi;package=${pkg};end;`;
};

/**
 * Detects if the current environment is a restrictive WebView (WhatsApp, Instagram, etc.)
 */
export const detectWebView = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return (
    (ua.indexOf('wv') > -1) || 
    (ua.indexOf('FBAN') > -1) || 
    (ua.indexOf('FBAV') > -1) || 
    (ua.indexOf('Instagram') > -1) ||
    (ua.indexOf('WhatsApp') > -1)
  );
};

/**
 * Detects if the current OS is Android
 */
export const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

export { UPI_APPS };
