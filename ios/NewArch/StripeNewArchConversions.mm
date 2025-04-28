#import <Foundation/Foundation.h>
#import <React/RCTConversions.h>
#import "RCTFollyConvert.h"

namespace stripe::react {

NSArray<NSString *> * convertStringVectorToNSArray(const std::vector<std::string> &values) {
  NSMutableArray<NSString *> *result = [[NSMutableArray alloc] initWithCapacity:values.size()];
  for (const auto &value : values) {
    [result addObject:RCTNSStringFromString(value)];
  }
  return result;
}

NSArray<NSNumber *> * convertIntVectorToNSArray(const std::vector<int> &values) {
  NSMutableArray<NSNumber *> *result = [[NSMutableArray alloc] initWithCapacity:values.size()];
  for (int value : values) {
    [result addObject:@(value)];
  }
  return result;
}

NSDictionary * _Nullable convertFollyDynamicToNSDictionaryOrNil(const folly::dynamic &dyn)
{
  switch (dyn.type()) {
    case folly::dynamic::OBJECT: {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] initWithCapacity:dyn.size()];
      for (const auto &elem : dyn.items()) {
        id key = facebook::react::convertFollyDynamicToId(elem.first);
        id value = facebook::react::convertFollyDynamicToId(elem.second);
        if (key && value) {
          dict[key] = value;
        }
      }
      return dict;
    }
    default:
      return nil;
  }
}

NSDictionary * convertFollyDynamicToNSDictionary(const folly::dynamic &dyn)
{
  return convertFollyDynamicToNSDictionaryOrNil(dyn) ?: [NSDictionary new];
}

}
