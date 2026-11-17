import type { CheckoutOpener } from './payments';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler?: () => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
}

function loadScript(): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${RAZORPAY_SCRIPT_URL}"]`,
  );
  if (existing?.dataset.loaded === 'true') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const onError = () => {
      // Drop the failed element so a later attempt creates a fresh script.
      script.remove();
      reject(new Error('Unable to load Razorpay checkout'));
    };
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Loads Razorpay on demand and resolves only when the checkout modal closes,
 * so callers can re-read the authoritative plan after payment is submitted.
 */
export const loadRazorpayCheckout: CheckoutOpener = async (options, callbacks) => {
  await loadScript();
  const Razorpay = (window as RazorpayWindow).Razorpay;
  if (!Razorpay) {
    throw new Error('Razorpay checkout is unavailable');
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const close = () => {
      if (settled) return;
      settled = true;
      callbacks.onClose();
      resolve();
    };

    new Razorpay({
      key: options.keyId,
      amount: options.amountPaise,
      currency: options.currency,
      name: options.name,
      description: options.description,
      order_id: options.orderId,
      handler: close,
      modal: { ondismiss: close },
    }).open();
  });
};
