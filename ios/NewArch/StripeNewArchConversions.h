#import <Foundation/Foundation.h>

#include <folly/dynamic.h>
#include <vector>

// This file was moved in RN 0.81. This includes it differently depending on linkage
// and falls back to the old file for older RN versions.
#if __has_include(<react/utils/FollyConvert.h>)
  // static libs / header maps (no use_frameworks!)
  #import <react/utils/FollyConvert.h>
#elif __has_include("FollyConvert.h")
  /// `use_frameworks! :linkage => :static` users will need to import FollyConvert this way
  #import "FollyConvert.h"
#elif __has_include("RCTFollyConvert.h")
  #import "RCTFollyConvert.h"
#else
  #error "FollyConvert.h not found. Ensure React-utils & RCT-Folly pods are installed."
#endif

NS_ASSUME_NONNULL_BEGIN

namespace stripe::react {

NSArray<NSString *> * convertStringVectorToNSArray(const std::vector<std::string> &);

NSArray<NSNumber *> * convertIntVectorToNSArray(const std::vector<int> &);

NSDictionary * _Nullable convertFollyDynamicToNSDictionaryOrNil(const folly::dynamic &dyn);

NSDictionary * convertFollyDynamicToNSDictionary(const folly::dynamic &dyn);

}

NS_ASSUME_NONNULL_END
