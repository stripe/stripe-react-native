import type { ImageSourcePropType } from 'react-native';

/**
 * Allows using types that codegen doesn't support, which will be generated
 * as mixed, but keeping the TS type for type-checking.
 */
export type UnsafeMixed<T> = T;

/**
 * Codegen checks for a type named image source, but rn typescript exports it as ImageSourcePropType.
 */
export type ImageSource = ImageSourcePropType;
