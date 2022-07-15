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
    
    internal static func presentSheet(
        withClientSecret: String,
        resolve: @escaping RCTPromiseResolveBlock
    ) -> Void {
        DispatchQueue.main.async {
            FinancialConnectionsSheet(financialConnectionsSessionClientSecret: withClientSecret).presentForToken(
              from: findViewControllerPresenter(from: UIApplication.shared.delegate?.window??.rootViewController ?? UIViewController()),
              completion: { result in
                  switch result {
                  case .completed(result: let result):
                      resolve(FinancialConnections.buildResult(session: result.session, token: result.token))
                  case .canceled:
                      resolve(Errors.createError(ErrorType.Canceled, "The flow has been canceled."))
                  case .failed(let error):
                      resolve(Errors.createError(ErrorType.Failed, error))
                  }
            })
        }
    }
    
    internal static func buildResult(
        session: StripeAPI.FinancialConnectionsSession,
        token: StripeAPI.BankAccountToken?
    ) -> NSDictionary {
        let tokenResult: NSDictionary = [
            "bankAccount": FinancialConnections.mapFromBankAccount(bankAccount: token?.bankAccount) ?? NSNull(),
            "livemode": token?.livemode ?? NSNull(),
            "id": token?.id ?? NSNull(),
            "used": token?.used ?? NSNull(),
            "type": Mappers.mapFromTokenType(STPTokenType.bankAccount) ?? NSNull(),
            "created": NSNull(), // Doesn't exist on StripeAPI.BankAccountToken
            "card": NSNull()
        ]
        
        let sessionResult: NSDictionary = [
            "id": session.id,
            "clientSecret": session.clientSecret,
            "livemode": session.livemode,
            "bankAccountToken": tokenResult,
            "accounts": FinancialConnections.mapFromAccountsList(accounts: session.accounts)
        ]

        return [ "session": sessionResult ]
    }
    
    internal static func mapFromBankAccount(
        bankAccount: StripeAPI.BankAccountToken.BankAccount?
    ) -> NSDictionary? {
        guard let bankAccount = bankAccount else {
            return nil
        }

        return [
            "id": bankAccount.id,
            "accountHolderName": bankAccount.accountHolderName ?? NSNull(),
            "accountHolderType": NSNull(), // Doesn't exist on StripeAPI.BankAccountToken
            "bankName": bankAccount.bankName ?? NSNull(),
            "country": bankAccount.country,
            "currency": bankAccount.currency,
            "fingerprint": bankAccount.fingerprint ?? NSNull(),
            "last4": bankAccount.last4,
            "routingNumber": bankAccount.routingNumber ?? NSNull(),
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
                "created": account.created,
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
            "asOf": balance.asOf,
            "type": balance.type.rawValue,
//             TODO: Protected by internal on iOS only. PR is out to fix
            "cash": NSNull(),   // balance.cash?.available
            "credit": NSNull(), // balance.credit?.used
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
            "lastAttemptedAt": balanceRefresh.lastAttemptedAt,
        ]
    }
}
