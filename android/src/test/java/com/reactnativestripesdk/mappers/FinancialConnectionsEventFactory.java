package com.reactnativestripesdk.mappers;

import com.stripe.android.financialconnections.analytics.FinancialConnectionsEvent;

final class FinancialConnectionsEventFactory {
  static FinancialConnectionsEvent create(
      FinancialConnectionsEvent.Name name,
      FinancialConnectionsEvent.ErrorCode errorCode,
      String financialConnectionsSessionId) {
    return new FinancialConnectionsEvent(
        name,
        new FinancialConnectionsEvent.Metadata(null, null, errorCode),
        financialConnectionsSessionId);
  }
}
