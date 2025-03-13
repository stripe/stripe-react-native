import type { ImageSourcePropType } from 'react-native';

/**
 * Allows using types that codegen doesn't support, which will be generated
 * as mixed, but keeping the TS type for type-checking.
 *
 * Note that for some reason this only works for native components, not for turbo modules.
 */
export type UnsafeMixed<T> = T;

/**
 * Allows using types that codegen doesn't support, which will be generated
 * as object, but keeping the TS type for type-checking.
 *
 * Note that for some reason this only works for turbo modules, not for native components.
 */
export type UnsafeObject<T> = T;

/**
 * Codegen checks for a type named image source, but rn typescript exports it as ImageSourcePropType.
 */
export type ImageSource = ImageSourcePropType;
