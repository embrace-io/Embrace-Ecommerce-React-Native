import {Product, Category} from '../models/Product';
import {User} from '../models/User';
import {Order} from '../models/Order';
import {Address} from '../models/Address';
import {ShippingMethod} from '../models/Order';
import {
  mockProducts,
  mockCategories,
  mockUser,
  mockAddresses,
  mockShippingMethods,
} from './mockData';
import {embraceService, HttpMethod} from './embrace';

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(() => resolve(), ms));

// Simulated API base URL for network request tracking
const API_BASE_URL = 'https://api.embrace-ecommerce.com/v1';

interface NetworkRequestOptions {
  endpoint: string;
  method: HttpMethod;
  body?: unknown;
}

class APIService {
  private mockDelay = 500;
  private requestIdCounter = 0;

  private generateRequestId(): string {
    return `req_${++this.requestIdCounter}_${Date.now()}`;
  }

  private async executeRequest<T>(
    options: NetworkRequestOptions,
    operation: () => Promise<T>,
  ): Promise<T> {
    const url = `${API_BASE_URL}${options.endpoint}`;
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Start a span for this network request
    const spanId = embraceService.startSpan(`api_${options.endpoint}`, {
      'http.url': url,
      'http.method': options.method,
      'request.id': requestId,
    });

    try {
      const result = await operation();
      const endTime = Date.now();

      // Record successful network request
      embraceService.recordNetworkRequest({
        url,
        method: options.method,
        startTime,
        endTime,
        statusCode: 200,
        bytesSent: options.body ? JSON.stringify(options.body).length : 0,
        bytesReceived: JSON.stringify(result).length,
      });

      // End span successfully
      if (spanId) {
        embraceService.addSpanAttribute(spanId, 'http.status_code', '200');
        embraceService.addSpanAttribute(
          spanId,
          'duration_ms',
          (endTime - startTime).toString(),
        );
        embraceService.endSpan(spanId, true);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Record failed network request
      embraceService.recordNetworkError({
        url,
        method: options.method,
        startTime,
        endTime,
        errorType: 'api_error',
        errorMessage,
      });

      // End span with error
      if (spanId) {
        embraceService.addSpanAttribute(spanId, 'error.message', errorMessage);
        embraceService.endSpan(spanId, false);
      }

      throw error;
    }
  }

  async fetchProducts(): Promise<Product[]> {
    return this.executeRequest(
      {endpoint: '/products', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_PRODUCTS');
        await delay(this.mockDelay);
        return mockProducts;
      },
    );
  }

  async fetchProductById(id: string): Promise<Product | null> {
    return this.executeRequest(
      {endpoint: `/products/${id}`, method: 'GET'},
      async () => {
        embraceService.addBreadcrumb(`API_FETCH_PRODUCT_${id}`);
        await delay(this.mockDelay);
        return mockProducts.find(p => p.id === id) || null;
      },
    );
  }

  async fetchProductsByCategory(category: string): Promise<Product[]> {
    return this.executeRequest(
      {endpoint: `/products?category=${category}`, method: 'GET'},
      async () => {
        embraceService.addBreadcrumb(`API_FETCH_CATEGORY_${category}`);
        await delay(this.mockDelay);
        return mockProducts.filter(
          p => p.category.toLowerCase() === category.toLowerCase(),
        );
      },
    );
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.executeRequest(
      {endpoint: `/products/search?q=${encodeURIComponent(query)}`, method: 'GET'},
      async () => {
        embraceService.addBreadcrumb(`API_SEARCH_${query}`);
        await delay(this.mockDelay);
        const lowerQuery = query.toLowerCase();
        const results = mockProducts.filter(
          p =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery) ||
            p.brand.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery),
        );

        // Track search with results
        embraceService.trackSearch({
          query,
          resultCount: results.length,
        });

        return results;
      },
    );
  }

  async fetchCategories(): Promise<Category[]> {
    return this.executeRequest(
      {endpoint: '/categories', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_CATEGORIES');
        await delay(this.mockDelay);
        return mockCategories;
      },
    );
  }

  async fetchFeaturedProducts(): Promise<Product[]> {
    return this.executeRequest(
      {endpoint: '/products/featured', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_FEATURED');
        await delay(this.mockDelay);
        return mockProducts.slice(0, 4);
      },
    );
  }

  async fetchNewArrivals(): Promise<Product[]> {
    return this.executeRequest(
      {endpoint: '/products/new-arrivals', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_NEW_ARRIVALS');
        await delay(this.mockDelay);
        return [...mockProducts]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 4);
      },
    );
  }

  async login(
    email: string,
    password: string,
  ): Promise<{user: User; token: string}> {
    return this.executeRequest(
      {endpoint: '/auth/login', method: 'POST', body: {email}},
      async () => {
        embraceService.trackLoginAttempt('email');
        await delay(this.mockDelay);

        // Simulate 10% failure rate for testing
        if (Math.random() < 0.1) {
          embraceService.trackLoginFailure('email', 'Invalid credentials');
          throw new Error('Invalid credentials');
        }

        // Track successful login with user details
        embraceService.trackLoginSuccess(mockUser.id, 'email', mockUser.email);
        embraceService.setUsername(
          `${mockUser.firstName} ${mockUser.lastName}`,
        );

        return {
          user: mockUser,
          token: 'mock-jwt-token-' + Date.now(),
        };
      },
    );
  }

  async register(
    email: string,
    _password: string,
    firstName: string,
    lastName: string,
  ): Promise<{user: User; token: string}> {
    return this.executeRequest(
      {endpoint: '/auth/register', method: 'POST', body: {email, firstName, lastName}},
      async () => {
        embraceService.addBreadcrumb('USER_REGISTRATION_ATTEMPT');
        await delay(this.mockDelay);

        const newUser: User = {
          id: 'user-' + Date.now(),
          email,
          firstName,
          lastName,
          dateJoined: new Date().toISOString(),
          isGuest: false,
          preferences: {
            newsletter: false,
            pushNotifications: true,
            biometricAuth: false,
            preferredCurrency: 'USD',
          },
        };

        // Track registration and login
        embraceService.trackRegistration(newUser.id, newUser.email);
        embraceService.trackLoginSuccess(newUser.id, 'email', newUser.email);
        embraceService.setUsername(`${newUser.firstName} ${newUser.lastName}`);

        return {
          user: newUser,
          token: 'mock-jwt-token-' + Date.now(),
        };
      },
    );
  }

  async guestCheckout(): Promise<{user: User; token: string}> {
    return this.executeRequest(
      {endpoint: '/auth/guest', method: 'POST'},
      async () => {
        embraceService.trackLoginAttempt('guest');
        await delay(300);

        const guestUser: User = {
          id: 'guest-' + Date.now(),
          email: '',
          firstName: 'Guest',
          lastName: 'User',
          dateJoined: new Date().toISOString(),
          isGuest: true,
          preferences: {
            newsletter: false,
            pushNotifications: false,
            biometricAuth: false,
            preferredCurrency: 'USD',
          },
        };

        embraceService.trackLoginSuccess(guestUser.id, 'guest');

        return {
          user: guestUser,
          token: 'guest-token-' + Date.now(),
        };
      },
    );
  }

  async fetchUserAddresses(): Promise<Address[]> {
    return this.executeRequest(
      {endpoint: '/user/addresses', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_ADDRESSES');
        await delay(this.mockDelay);
        return mockAddresses;
      },
    );
  }

  async fetchShippingMethods(): Promise<ShippingMethod[]> {
    return this.executeRequest(
      {endpoint: '/shipping/methods', method: 'GET'},
      async () => {
        embraceService.addBreadcrumb('API_FETCH_SHIPPING_METHODS');
        await delay(this.mockDelay);
        return mockShippingMethods;
      },
    );
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    return this.executeRequest(
      {endpoint: '/orders', method: 'POST', body: orderData},
      async () => {
        const orderId = 'order-' + Date.now();

        // Track purchase attempt
        embraceService.trackPurchaseAttempt({
          orderId,
          totalAmount: orderData.total || 0,
          itemCount: orderData.items?.length || 0,
        });

        await delay(this.mockDelay * 2);

        const order: Order = {
          id: orderId,
          orderNumber:
            'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          userId: orderData.userId || 'guest',
          items: orderData.items || [],
          shippingAddress: orderData.shippingAddress!,
          billingAddress: orderData.billingAddress!,
          paymentMethod: orderData.paymentMethod!,
          status: 'pending',
          subtotal: orderData.subtotal || 0,
          tax: orderData.tax || 0,
          shipping: orderData.shipping || 0,
          total: orderData.total || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          estimatedDelivery: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

        embraceService.addBreadcrumb('ORDER_DETAILS_API_COMPLETED');
        return order;
      },
    );
  }

  async fetchUserOrders(userId: string): Promise<Order[]> {
    return this.executeRequest(
      {endpoint: `/orders?userId=${userId}`, method: 'GET'},
      async () => {
        embraceService.addBreadcrumb(`API_FETCH_ORDERS_${userId}`);
        await delay(this.mockDelay);
        return [];
      },
    );
  }

  async processPayment(
    amount: number,
    currency: string,
    orderId: string,
  ): Promise<{success: boolean; transactionId: string}> {
    return this.executeRequest(
      {endpoint: '/payments/process', method: 'POST', body: {amount, currency, orderId}},
      async () => {
        embraceService.addBreadcrumb('PAYMENT_PROCESSING_STARTED');
        await delay(this.mockDelay * 3);

        // Simulate 5% payment failure rate
        if (Math.random() < 0.05) {
          embraceService.addBreadcrumb('PAYMENT_PROCESSING_FAILED');
          embraceService.trackPurchaseFailure(
            orderId,
            'Payment declined',
            'card_declined',
          );
          throw new Error('Payment declined');
        }

        const transactionId = 'txn-' + Date.now();
        embraceService.addBreadcrumb('PAYMENT_PROCESSING_SUCCESS');

        // Track purchase success
        embraceService.trackPurchaseSuccess({
          orderId,
          totalAmount: amount,
          itemCount: 0, // Would need to pass from caller
          paymentMethod: 'credit_card',
        });

        return {
          success: true,
          transactionId,
        };
      },
    );
  }
}

export const apiService = new APIService();
