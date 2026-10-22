#import "ConnectBridgeContainerComponentView.h"

#import <react/renderer/components/rnstripe/ComponentDescriptors.h>
#import <react/renderer/components/rnstripe/EventEmitters.h>
#import <react/renderer/components/rnstripe/Props.h>
#import <react/renderer/components/rnstripe/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "StripeNewArchConversions.h"
#import "StripeSwiftInterop.h"

using namespace facebook::react;

@interface ConnectBridgeContainerComponentView () <RCTConnectBridgeContainerViewProtocol>
@end

@implementation ConnectBridgeContainerComponentView {
  ConnectBridgeContainerView *_view;
}

+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const ConnectBridgeContainerProps>();
    _props = defaultProps;
    [self prepareView];
  }

  return self;
}

- (void)prepareView
{
  _view = [ConnectBridgeContainerView new];
  self.contentView = _view;
  [_view setDiscoveryRoot:self];

  __weak __typeof(self) weakSelf = self;
  _view.onBridgeRequest = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    if (!strongSelf->_eventEmitter) {
      [strongSelf->_view cancel:event[@"attachmentId"] requestHandle:event[@"requestHandle"]];
      return;
    }
    ConnectBridgeContainerEventEmitter::OnBridgeRequest emitterEvent = {
        .attachmentId = std::string([event[@"attachmentId"] UTF8String] ?: ""),
        .requestHandle = std::string([event[@"requestHandle"] UTF8String] ?: ""),
        .documentId = std::string([event[@"documentId"] UTF8String] ?: ""),
        .contextId = std::string([event[@"contextId"] UTF8String] ?: ""),
        .sourceGeneration = std::string([event[@"sourceGeneration"] UTF8String] ?: ""),
        .rawMessage = std::string([event[@"rawMessage"] UTF8String] ?: ""),
    };
    std::static_pointer_cast<const ConnectBridgeContainerEventEmitter>(strongSelf->_eventEmitter)
        ->onBridgeRequest(std::move(emitterEvent));
  };

  _view.onBridgeClaimResult = ^(NSDictionary *event) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    if (!strongSelf->_eventEmitter) {
      [strongSelf->_view cancel:event[@"attachmentId"] requestHandle:event[@"requestHandle"]];
      return;
    }
    ConnectBridgeContainerEventEmitter::OnBridgeClaimResult emitterEvent = {
        .claimId = std::string([event[@"claimId"] UTF8String] ?: ""),
        .attachmentId = std::string([event[@"attachmentId"] UTF8String] ?: ""),
        .requestHandle = std::string([event[@"requestHandle"] UTF8String] ?: ""),
        .sourceGeneration = std::string([event[@"sourceGeneration"] UTF8String] ?: ""),
        .admitted = [event[@"admitted"] boolValue],
        .claimToken = std::string([event[@"claimToken"] UTF8String] ?: ""),
    };
    std::static_pointer_cast<const ConnectBridgeContainerEventEmitter>(strongSelf->_eventEmitter)
        ->onBridgeClaimResult(std::move(emitterEvent));
  };

  _view.onBridgeError = ^(NSString *error) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_eventEmitter) {
      return;
    }
    ConnectBridgeContainerEventEmitter::OnBridgeError emitterEvent = {.error = std::string(error.UTF8String ?: "")};
    std::static_pointer_cast<const ConnectBridgeContainerEventEmitter>(strongSelf->_eventEmitter)
        ->onBridgeError(std::move(emitterEvent));
  };
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<const ConnectBridgeContainerProps>(props);
  [_view updateConfigurationWithContextId:RCTNSStringFromString(newProps.contextId)
                        sourceGeneration:RCTNSStringFromString(newProps.sourceGeneration)
                           connectSource:RCTNSStringFromString(newProps.connectSource)
                initializationObjectJson:RCTNSStringFromString(newProps.initializationObjectJson)
                    observeContentHeight:newProps.observeContentHeight];

  [super updateProps:props oldProps:oldProps];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
  RCTConnectBridgeContainerHandleCommand(self, commandName, args);
}

- (void)reply:(NSString *)attachmentId requestHandle:(NSString *)requestHandle payload:(NSString *)payload
{
  [_view reply:attachmentId requestHandle:requestHandle payload:payload];
}

- (void)claim:(NSString *)claimId
        attachmentId:(NSString *)attachmentId
       requestHandle:(NSString *)requestHandle
          documentId:(NSString *)documentId
           contextId:(NSString *)contextId
    sourceGeneration:(NSString *)sourceGeneration
{
  [_view claim:claimId
          attachmentId:attachmentId
         requestHandle:requestHandle
            documentId:documentId
             contextId:contextId
      sourceGeneration:sourceGeneration];
}

- (void)cancel:(NSString *)attachmentId requestHandle:(NSString *)requestHandle
{
  [_view cancel:attachmentId requestHandle:requestHandle];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<ConnectBridgeContainerComponentDescriptor>();
}

- (void)prepareForRecycle
{
  [_view dispose];
  [super prepareForRecycle];
  [self prepareView];
}

@end

Class<RCTComponentViewProtocol> ConnectBridgeContainerCls(void)
{
  return ConnectBridgeContainerComponentView.class;
}
