import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './HomeScreen';
declare type ScreenRouteProp = RouteProp<RootStackParamList, 'PaymentResultScreen'>;
declare type Props = {
    route: ScreenRouteProp;
};
export default function PaymentResultScreen({ route }: Props): JSX.Element;
export {};
