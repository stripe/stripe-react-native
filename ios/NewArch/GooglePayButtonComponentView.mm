#import <React/RCTFabricComponentsPlugins.h>
#import <React/RCTViewComponentView.h>

// On older versions of react-native every single spec is linked so we need
// to include a dummy implementation to avoid linker errors.
Class<RCTComponentViewProtocol> GooglePayButtonCls(void)
{
  return RCTViewComponentView.class;
}
