import React from 'react';
interface Props {
    paymentMethod?: string;
    onInit?(): void;
}
declare const PaymentScreen: React.FC<Props>;
export default PaymentScreen;
