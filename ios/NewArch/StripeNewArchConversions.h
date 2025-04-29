#import <Foundation/Foundation.h>

#include <folly/dynamic.h>
#include <vector>

NS_ASSUME_NONNULL_BEGIN

namespace stripe::react {

NSArray<NSString *> * convertStringVectorToNSArray(const std::vector<std::string> &);

NSArray<NSNumber *> * convertIntVectorToNSArray(const std::vector<int> &);

NSDictionary * _Nullable convertFollyDynamicToNSDictionaryOrNil(const folly::dynamic &dyn);

NSDictionary * convertFollyDynamicToNSDictionary(const folly::dynamic &dyn);

}

NS_ASSUME_NONNULL_END
