import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useCartStore} from '../store/cartStore';
import {useAuthStore} from '../store/authStore';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';
import {Address} from '../models/Address';
import {ShippingMethod} from '../models/Order';
import {PaymentMethod} from '../models/Payment';
import {Button, Input, LoadingSpinner} from '../components';
import {RootStackParamList} from '../navigation/types';
import {mockAddresses, mockShippingMethods} from '../services/mockData';

type CheckoutNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type CheckoutStep = 'shipping' | 'payment' | 'review' | 'confirmation';

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const {items, subtotal, clearCart} = useCartStore();
  const {user} = useAuthStore();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [loading, setLoading] = useState(false);

  // Shipping State
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null);
  const [addresses] = useState<Address[]>(mockAddresses);
  const [shippingMethods] = useState<ShippingMethod[]>(mockShippingMethods);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');

  // Order State
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const tax = subtotal * 0.08;
  const shippingCost = shippingMethod?.cost || 0;
  const total = subtotal + tax + shippingCost;

  useEffect(() => {
    embraceService.trackCheckoutStep(1, 'SHIPPING');
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
      setShippingAddress(defaultAddress);
    }
    if (shippingMethods.length > 0) {
      setShippingMethod(shippingMethods[0]);
    }
  }, []);

  const handleNextStep = async () => {
    switch (currentStep) {
      case 'shipping':
        if (!shippingAddress || !shippingMethod) {
          Alert.alert('Error', 'Please select shipping address and method');
          return;
        }
        embraceService.trackCheckoutStep(2, 'PAYMENT');
        setCurrentStep('payment');
        break;

      case 'payment':
        if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
          Alert.alert('Error', 'Please fill in all payment details');
          return;
        }
        const payment: PaymentMethod = {
          id: 'payment-' + Date.now(),
          type: 'creditCard',
          cardInfo: {
            last4: cardNumber.slice(-4),
            brand: 'Visa',
            expiryMonth: parseInt(cardExpiry.split('/')[0]),
            expiryYear: parseInt('20' + cardExpiry.split('/')[1]),
            holderName: cardName,
          },
          isDefault: false,
        };
        setPaymentMethod(payment);
        embraceService.trackCheckoutStep(3, 'REVIEW');
        setCurrentStep('review');
        break;

      case 'review':
        await processOrder();
        break;
    }
  };

  const processOrder = async () => {
    setLoading(true);
    embraceService.addBreadcrumb('PLACE_ORDER_INITIATED');

    // Generate a temporary order ID for tracking (will be replaced by server-generated ID)
    const tempOrderId = `temp-order-${Date.now()}`;

    try {
      // Process payment with order tracking
      const paymentResult = await apiService.processPayment(
        total,
        'USD',
        tempOrderId,
      );

      if (paymentResult.success) {
        // Create order
        const order = await apiService.createOrder({
          userId: user?.id || 'guest',
          items: items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            selectedVariants: item.selectedVariants,
            imageUrl: item.product.imageUrls[0],
          })),
          shippingAddress: shippingAddress!,
          billingAddress: shippingAddress!,
          paymentMethod: paymentMethod!,
          subtotal,
          tax,
          shipping: shippingCost,
          total,
        });

        setOrderId(order.id);
        setOrderNumber(order.orderNumber);
        embraceService.trackCheckoutCompleted(order.id, total);
        clearCart();
        setCurrentStep('confirmation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      embraceService.logError('Order processing failed', {error: errorMessage});
      Alert.alert('Error', 'Failed to process your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackStep = () => {
    switch (currentStep) {
      case 'payment':
        embraceService.trackCheckoutStep(1, 'SHIPPING');
        setCurrentStep('shipping');
        break;
      case 'review':
        embraceService.trackCheckoutStep(2, 'PAYMENT');
        setCurrentStep('payment');
        break;
    }
  };

  const renderStepIndicator = () => {
    const steps = ['Shipping', 'Payment', 'Review'];
    const currentIndex = ['shipping', 'payment', 'review'].indexOf(currentStep);

    if (currentStep === 'confirmation') return null;

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index <= currentIndex && styles.stepCircleActive,
              ]}>
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentIndex && styles.stepNumberActive,
                ]}>
                {index + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                index <= currentIndex && styles.stepLabelActive,
              ]}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderShippingStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Shipping Address</Text>

      {addresses.map(address => (
        <TouchableOpacity
          key={address.id}
          style={[
            styles.addressCard,
            shippingAddress?.id === address.id && styles.addressCardSelected,
          ]}
          onPress={() => setShippingAddress(address)}>
          <View style={styles.addressRadio}>
            <View
              style={[
                styles.radioOuter,
                shippingAddress?.id === address.id && styles.radioSelected,
              ]}>
              {shippingAddress?.id === address.id && (
                <View style={styles.radioInner} />
              )}
            </View>
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressName}>
              {address.firstName} {address.lastName}
            </Text>
            <Text style={styles.addressLine}>{address.street}</Text>
            {address.street2 && (
              <Text style={styles.addressLine}>{address.street2}</Text>
            )}
            <Text style={styles.addressLine}>
              {address.city}, {address.state} {address.zipCode}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.addNewButton}
        onPress={() => setShowNewAddressForm(!showNewAddressForm)}>
        <Text style={styles.addNewText}>
          {showNewAddressForm ? 'Cancel' : '+ Add New Address'}
        </Text>
      </TouchableOpacity>

      {showNewAddressForm && (
        <View style={styles.newAddressForm}>
          <View style={styles.row}>
            <Input
              label="First Name"
              value={newAddress.firstName}
              onChangeText={v => setNewAddress({...newAddress, firstName: v})}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Last Name"
              value={newAddress.lastName}
              onChangeText={v => setNewAddress({...newAddress, lastName: v})}
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="Street Address"
            value={newAddress.street}
            onChangeText={v => setNewAddress({...newAddress, street: v})}
          />
          <View style={styles.row}>
            <Input
              label="City"
              value={newAddress.city}
              onChangeText={v => setNewAddress({...newAddress, city: v})}
              containerStyle={styles.halfInput}
            />
            <Input
              label="State"
              value={newAddress.state}
              onChangeText={v => setNewAddress({...newAddress, state: v})}
              containerStyle={styles.halfInput}
            />
          </View>
          <Input
            label="ZIP Code"
            value={newAddress.zipCode}
            onChangeText={v => setNewAddress({...newAddress, zipCode: v})}
            keyboardType="numeric"
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, {marginTop: 24}]}>Shipping Method</Text>

      {shippingMethods.map(method => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.shippingMethodCard,
            shippingMethod?.id === method.id && styles.shippingMethodSelected,
          ]}
          onPress={() => setShippingMethod(method)}>
          <View style={styles.shippingMethodInfo}>
            <Text style={styles.shippingMethodName}>{method.name}</Text>
            <Text style={styles.shippingMethodDesc}>{method.description}</Text>
          </View>
          <Text style={styles.shippingMethodPrice}>
            {method.cost === 0 ? 'FREE' : `$${method.cost.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPaymentStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContent}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <Input
          label="Cardholder Name"
          value={cardName}
          onChangeText={setCardName}
          placeholder="John Doe"
          autoCapitalize="words"
        />
        <Input
          label="Card Number"
          value={cardNumber}
          onChangeText={text => {
            const cleaned = text.replace(/\D/g, '').slice(0, 16);
            setCardNumber(cleaned);
          }}
          placeholder="4242 4242 4242 4242"
          keyboardType="numeric"
        />
        <View style={styles.row}>
          <Input
            label="Expiry (MM/YY)"
            value={cardExpiry}
            onChangeText={text => {
              const cleaned = text.replace(/\D/g, '').slice(0, 4);
              if (cleaned.length >= 2) {
                setCardExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2));
              } else {
                setCardExpiry(cleaned);
              }
            }}
            placeholder="12/25"
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="CVC"
            value={cardCVC}
            onChangeText={text => setCardCVC(text.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            keyboardType="numeric"
            secureTextEntry
            containerStyle={styles.halfInput}
          />
        </View>

        <View style={styles.testCardInfo}>
          <Text style={styles.testCardTitle}>Test Card Numbers:</Text>
          <Text style={styles.testCardText}>Success: 4242 4242 4242 4242</Text>
          <Text style={styles.testCardText}>Any expiry and CVC</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Order Summary</Text>

      {/* Items */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Items ({items.length})</Text>
        {items.map(item => (
          <View key={item.id} style={styles.reviewItem}>
            <Text style={styles.reviewItemName}>
              {item.product.name} x{item.quantity}
            </Text>
            <Text style={styles.reviewItemPrice}>
              ${(item.unitPrice * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Shipping */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Shipping To</Text>
        {shippingAddress && (
          <Text style={styles.reviewText}>
            {shippingAddress.firstName} {shippingAddress.lastName}
            {'\n'}
            {shippingAddress.street}
            {'\n'}
            {shippingAddress.city}, {shippingAddress.state}{' '}
            {shippingAddress.zipCode}
          </Text>
        )}
        <Text style={styles.reviewShippingMethod}>
          {shippingMethod?.name} - {shippingMethod?.description}
        </Text>
      </View>

      {/* Payment */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Payment Method</Text>
        <Text style={styles.reviewText}>
          {paymentMethod?.cardInfo?.brand} ending in{' '}
          {paymentMethod?.cardInfo?.last4}
        </Text>
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping</Text>
          <Text style={styles.totalValue}>
            {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax</Text>
          <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.totalRowFinal]}>
          <Text style={styles.totalLabelFinal}>Total</Text>
          <Text style={styles.totalValueFinal}>${total.toFixed(2)}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderConfirmationStep = () => (
    <View style={styles.confirmationContainer}>
      <View style={styles.confirmationIcon}>
        <Text style={styles.confirmationIconText}>✓</Text>
      </View>
      <Text style={styles.confirmationTitle}>Order Confirmed!</Text>
      <Text style={styles.confirmationOrderNumber}>
        Order #{orderNumber}
      </Text>
      <Text style={styles.confirmationMessage}>
        Thank you for your purchase. You will receive a confirmation email
        shortly.
      </Text>
      <Button
        title="Continue Shopping"
        onPress={() => navigation.navigate('MainTabs', {screen: 'Home'})}
        style={styles.confirmationButton}
      />
    </View>
  );

  if (loading) {
    return <LoadingSpinner fullScreen message="Processing your order..." />;
  }

  return (
    <View style={styles.container}>
      {renderStepIndicator()}

      {currentStep === 'shipping' && renderShippingStep()}
      {currentStep === 'payment' && renderPaymentStep()}
      {currentStep === 'review' && renderReviewStep()}
      {currentStep === 'confirmation' && renderConfirmationStep()}

      {currentStep !== 'confirmation' && (
        <View style={styles.bottomBar}>
          {currentStep !== 'shipping' && (
            <Button
              title="Back"
              onPress={handleBackStep}
              variant="outline"
              style={styles.backButton}
            />
          )}
          <Button
            title={currentStep === 'review' ? 'Place Order' : 'Continue'}
            onPress={handleNextStep}
            style={styles.nextButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stepItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#000',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999',
  },
  stepLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  addressCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addressCardSelected: {
    borderColor: '#000',
  },
  addressRadio: {
    marginRight: 12,
    paddingTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#000',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  addNewButton: {
    paddingVertical: 12,
  },
  addNewText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  newAddressForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  shippingMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  shippingMethodSelected: {
    borderColor: '#000',
  },
  shippingMethodInfo: {
    flex: 1,
  },
  shippingMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  shippingMethodDesc: {
    fontSize: 13,
    color: '#666',
  },
  shippingMethodPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  testCardInfo: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  testCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  testCardText: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  reviewSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  reviewItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewShippingMethod: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  confirmationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  confirmationIconText: {
    fontSize: 40,
    color: '#fff',
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  confirmationOrderNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  confirmationButton: {
    minWidth: 200,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  nextButton: {
    flex: 2,
  },
});
