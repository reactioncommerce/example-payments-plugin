/* eslint camelcase: 0 */
// reaction modules
import Schemas, { ValidCardNumber, ValidExpireMonth, ValidExpireYear, ValidCVV } from "@reactioncommerce/schemas";
import Logger from "@reactioncommerce/logger";
import { ExampleApi } from "./exampleapi";

/**
 * @method normalizeRiskLevel
 * @private
 * @summary Normalizes the risk level response of a transaction to the values defined in paymentMethod schema
 * @param  {object} transaction - The transaction that we need to normalize
 * @return {string} normalized status string - either elevated, high, or normal
 */
function normalizeRiskLevel(transaction) {
  // the values to be checked against will depend on the return codes/values from the payment API
  if (transaction.riskStatus === "low_risk_level") {
    return "elevated";
  }

  if (transaction.riskStatus === "highest_risk_level") {
    return "high";
  }

  // default to normal if no other flagged
  return "normal";
}


export default function getMeteorMethods({ check, Match }) {
  if (typeof check !== "function" || typeof Match !== "function") {
    throw new Error("getMethods requires 'check' and 'Match'");
  }

  return {
    /**
     * Submit a card for Authorization
     * @param  {Object} transactionType authorize or capture
     * @param  {Object} cardData card Details
     * @param  {Object} paymentData The details of the Payment Needed
     * @return {Object} results normalized
     */
    "exampleSubmit"(transactionType, cardData, paymentData) {
      check(transactionType, String);
      check(cardData, {
        name: String,
        number: Match.Where(ValidCardNumber),
        expireMonth: Match.Where(ValidExpireMonth),
        expireYear: Match.Where(ValidExpireYear),
        cvv2: Match.Where(ValidCVV),
        type: String
      });

      check(paymentData, {
        total: String,
        currency: String
      });

      const total = parseFloat(paymentData.total);

      let result;
      try {
        const transaction = ExampleApi.methods.authorize.call({
          transactionType,
          cardData,
          paymentData
        });

        result = {
          saved: true,
          status: "created",
          currency: paymentData.currency,
          amount: total,
          riskLevel: normalizeRiskLevel(transaction),
          transactionId: transaction.id,
          response: {
            amount: total,
            transactionId: transaction.id,
            currency: paymentData.currency
          }
        };
      } catch (error) {
        Logger.error(error);
        result = {
          saved: false,
          error
        };
      }
      return result;
    },

    /**
     * Capture a Charge
     * @param {Object} paymentMethod Object containing data about the transaction to capture
     * @return {Object} results normalized
     */
    "example/payment/capture"(paymentMethod) {
      // Call both check and validate because by calling `clean`, the audit pkg
      // thinks that we haven't checked paymentMethod arg
      check(paymentMethod, Object);
      Schemas.PaymentMethodArgument.validate(Schemas.PaymentMethodArgument.clean(paymentMethod));

      const { amount, transactionId: authorizationId } = paymentMethod;
      const response = ExampleApi.methods.capture.call({
        authorizationId,
        amount
      });
      const result = {
        saved: true,
        response
      };
      return result;
    },

    /**
     * Create a refund
     * @param  {Object} paymentMethod object
     * @param  {Number} amount The amount to be refunded
     * @return {Object} result
     */
    "example/refund/create"(paymentMethod, amount) {
      check(amount, Number);

      // Call both check and validate because by calling `clean`, the audit pkg
      // thinks that we haven't checked paymentMethod arg
      check(paymentMethod, Object);
      Schemas.PaymentMethodArgument.validate(Schemas.PaymentMethodArgument.clean(paymentMethod));

      const { transactionId } = paymentMethod;
      const response = ExampleApi.methods.refund.call({
        transactionId,
        amount
      });
      const results = {
        saved: true,
        response
      };
      return results;
    },

    /**
     * List refunds
     * @param  {Object} paymentMethod Object containing the pertinant data
     * @return {Object} result
     */
    "example/refund/list"(paymentMethod) {
      // Call both check and validate because by calling `clean`, the audit pkg
      // thinks that we haven't checked paymentMethod arg
      check(paymentMethod, Object);
      Schemas.PaymentMethodArgument.validate(Schemas.PaymentMethodArgument.clean(paymentMethod));

      const { transactionId } = paymentMethod;
      const response = ExampleApi.methods.refunds.call({
        transactionId
      });
      const result = [];
      for (const refund of response.refunds) {
        result.push(refund);
      }

      // The results retured from the GenericAPI just so happen to look like exactly what the dashboard
      // wants. The return package should ba an array of objects that look like this
      // {
      //   type: "refund",
      //   amount: Number,
      //   created: Number: Epoch Time,
      //   currency: String,
      //   raw: Object
      // }
      const emptyResult = [];
      return emptyResult;
    }
  };
}
