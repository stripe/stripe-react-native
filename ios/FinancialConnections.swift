//
//  FinancialConnections.swift
//  stripe-react-native
//
//  Created by Charles Cruzan on 7/12/22.
//

import Foundation
import StripeFinancialConnections
import Stripe

class FinancialConnections {
    
    internal static func present(
        withClientSecret: String,
        resolve: @escaping RCTPromiseResolveBlock
    ) -> Void {
        DispatchQueue.main.async {
            FinancialConnectionsSheet(financialConnectionsSessionClientSecret: withClientSecret).present(
              from: findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()),
              completion: { result in
                  switch result {
                  case .completed(session: let session):
                      resolve([ "session": FinancialConnections.mapFromSessionResult(session) ])
                  case .canceled:
                      resolve(Errors.createError(ErrorType.Canceled, "The flow has been canceled."))
                  case .failed(let error):
                      resolve(Errors.createError(ErrorType.Failed, error))
                  }
            })
        }
    }
    
    internal static func presentForToken(
        withClientSecret: String,
        resolve: @escaping RCTPromiseResolveBlock
    ) -> Void {
        DispatchQueue.main.async {
            FinancialConnectionsSheet(financialConnectionsSessionClientSecret: withClientSecret).presentForToken(
              from: findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()),
              completion: { result in
                  switch result {
                  case .completed(result: let result):
                      resolve(
                        [
                            "session": FinancialConnections.mapFromSessionResult(result.session),
                            "token"  : FinancialConnections.mapFromTokenResult(result.token)
                        ]
                      )
                  case .canceled:
                      resolve(Errors.createError(ErrorType.Canceled, "The flow has been canceled."))
                  case .failed(let error):
                      resolve(Errors.createError(ErrorType.Failed, error))
                  }
            })
        }
    }
    
    internal static func mapFromSessionResult(
        _ session: StripeAPI.FinancialConnectionsSession
    ) -> NSDictionary {
        return [
            "id": session.id,
            "clientSecret": session.clientSecret,
            "livemode": session.livemode,
            "accounts": FinancialConnections.mapFromAccountsList(accounts: session.accounts)
        ]
    }
    
    internal static func mapFromTokenResult(
        _ token: StripeAPI.BankAccountToken?
    ) -> NSDictionary {
        return [
            "bankAccount": FinancialConnections.mapFromBankAccount(bankAccount: token?.bankAccount) ?? NSNull(),
            "livemode": token?.livemode ?? false,
            "id": token?.id ?? NSNull(),
            "used": token?.used ?? false,
            "type": Mappers.mapFromTokenType(STPTokenType.bankAccount) ?? NSNull(),
            "created": NSNull(), // Doesn't exist on StripeAPI.BankAccountToken
        ]
    }
    
    internal static func mapFromBankAccount(
        bankAccount: StripeAPI.BankAccountToken.BankAccount?
    ) -> NSDictionary? {
        guard let bankAccount = bankAccount else {
            return nil
        }
        // return Mappers.mapFromBankAccount(bankAccount) Cannot use this since it expects an STPBankAccount
        return [
            "id": bankAccount.id,
            "bankName": bankAccount.bankName ?? NSNull(),
            "accountHolderName": bankAccount.accountHolderName ?? NSNull(),
            "accountHolderType": NSNull(), // Doesn't exist on StripeAPI.BankAccountToken
            "currency": bankAccount.currency,
            "country": bankAccount.country,
            "routingNumber": bankAccount.routingNumber ?? NSNull(),
            "fingerprint": bankAccount.fingerprint ?? NSNull(),
            "last4": bankAccount.last4,
            "status": bankAccount.status.prefix(1).uppercased() + bankAccount.status.lowercased().dropFirst(), // stripe-ios returns a string, not STPBankAccountStatus
        ]
    }
    
    internal static func mapFromAccountsList(
        accounts: StripeAPI.FinancialConnectionsSession.AccountList
    ) -> [[String: Any]] {
        var result = [[String: Any]]()
        
        for account in accounts.data {
            result.append([
                "id": account.id,
                "livemode": account.livemode,
                "displayName": account.displayName ?? NSNull(),
                "status": account.status.rawValue,
                "institutionName": account.institutionName,
                "last4": account.last4 ?? NSNull(),
                "created": account.created * 1000,
                "balance": FinancialConnections.mapFromAccountBalance(balance: account.balance) ?? NSNull(),
                "balanceRefresh": FinancialConnections.mapFromAccountBalanceRefresh(balanceRefresh: account.balanceRefresh) ?? NSNull(),
                "category": account.category.rawValue,
                "subcategory": account.subcategory.rawValue,
                "permissions": account.permissions?.map { $0.rawValue } ?? NSNull(),
                "supportedPaymentMethodTypes": account.supportedPaymentMethodTypes.map { $0.rawValue },
            ])
        }
        
        return result
    }
    
    internal static func mapFromAccountBalance(
        balance: StripeAPI.FinancialConnectionsAccount.Balance?
    ) -> NSDictionary? {
        guard let balance = balance else {
            return nil
        }
    
        return [
            "asOf": balance.asOf * 1000,
            "type": balance.type.rawValue,
//             TODO: Protected by internal on iOS only. PR is out to fix
            "cash": ["available": NSNull()],   // balance.cash?.available
            "credit": ["used": NSNull()], // balance.credit?.used
            "current": balance.current,
        ]
    }

    internal static func mapFromAccountBalanceRefresh(
        balanceRefresh: StripeAPI.FinancialConnectionsAccount.BalanceRefresh?
    ) -> NSDictionary? {
        guard let balanceRefresh = balanceRefresh else {
            return nil
        }
    
        return [
            "status": balanceRefresh.status.rawValue,
            "lastAttemptedAt": balanceRefresh.lastAttemptedAt * 1000,
        ]
    }
}
