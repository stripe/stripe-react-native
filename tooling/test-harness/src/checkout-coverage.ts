type MountCheckout = (controllerId: string) => Promise<void>;

let mountCheckout: MountCheckout | null = null;

export function registerCheckoutMount(mount: MountCheckout) {
  mountCheckout = mount;
}

export function mountCheckoutElement(controllerId: string): Promise<void> {
  if (!mountCheckout) {
    throw new Error('Checkout coverage mount is unavailable');
  }
  return mountCheckout(controllerId);
}
