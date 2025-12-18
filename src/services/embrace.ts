import {Platform} from 'react-native';
import {EMBRACE_CONFIG} from '../config/embrace.config';
import {
  initialize,
  logInfo,
  logWarning,
  logError,
  logMessage,
  logHandledError,
  addBreadcrumb,
  setUserIdentifier,
  setUserEmail,
  setUsername,
  clearUserIdentifier,
  clearUserEmail,
  clearUsername,
  addSessionProperty,
  removeSessionProperty,
  getCurrentSessionId,
  getDeviceId,
  endSession,
  recordNetworkRequest,
  logNetworkClientError,
} from '@embrace-io/react-native';
import {
  EmbraceNativeTracerProvider,
  startView,
  recordCompletedSpan,
} from '@embrace-io/react-native-tracer-provider';
import {Tracer, Span, SpanStatusCode} from '@opentelemetry/api';

export type LogSeverity = 'info' | 'warning' | 'error';
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS';

interface NetworkRequestParams {
  url: string;
  method: HttpMethod;
  startTime: number;
  endTime: number;
  bytesSent?: number;
  bytesReceived?: number;
  statusCode?: number;
}

interface NetworkErrorParams {
  url: string;
  method: HttpMethod;
  startTime: number;
  endTime: number;
  errorType: string;
  errorMessage: string;
}

interface ProductInfo {
  productId: string;
  productName: string;
  category?: string;
  price: number;
}

interface CartInfo {
  productId: string;
  quantity: number;
  price: number;
  cartTotalItems?: number;
  cartSubtotal?: number;
}

interface PurchaseInfo {
  orderId: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod?: string;
}

interface SearchInfo {
  query: string;
  resultCount: number;
  filters?: Record<string, string>;
}

class EmbraceService {
  private isInitialized = false;
  private tracerProvider: EmbraceNativeTracerProvider | null = null;
  private tracer: Tracer | null = null;
  private activeSpans: Map<string, Span> = new Map();

  async initialize(): Promise<boolean> {
    try {
      const started = await initialize({
        sdkConfig: {
          ios: {
            appId: EMBRACE_CONFIG.ios.appId,
          },
        },
      });

      this.isInitialized = started;

      if (started) {
        console.log('Embrace SDK initialized successfully');

        // Initialize tracer provider for spans
        this.tracerProvider = new EmbraceNativeTracerProvider();
        this.tracer = this.tracerProvider.getTracer(
          'embrace-ecommerce-rn',
          '1.0.0',
        );

        this.addBreadcrumb('APP_INITIALIZED');

        // Session properties
        this.addSessionProperty('app_version', '1.0.0', true);
        this.addSessionProperty('platform', 'react-native', true);
        this.addSessionProperty('app_type', 'dogfooding_ecommerce', true);
        this.addSessionProperty('sdk_test_mode', 'enabled');
        this.addSessionProperty('environment', __DEV__ ? 'development' : 'production');
        this.addSessionProperty(
          'session_run_source',
          Platform.OS === 'ios' ? 'Simulator' : 'Emulator',
        );

        // Start CI crash simulation if enabled
        this.startCICrashSimulation();
      } else {
        console.warn('Embrace SDK failed to initialize');
      }

      return started;
    } catch (error) {
      console.error('Error initializing Embrace SDK:', error);
      return false;
    }
  }

  // ============================================
  // BREADCRUMBS
  // ============================================

  addBreadcrumb(message: string): void {
    if (!this.isInitialized) return;
    try {
      addBreadcrumb(message);
    } catch (error) {
      console.warn('Failed to add breadcrumb:', error);
    }
  }

  // ============================================
  // LOGGING WITH PROPERTIES
  // ============================================

  logInfo(message: string, properties?: Record<string, string>): void {
    if (!this.isInitialized) return;
    try {
      if (properties) {
        logMessage(message, 'info', properties, false);
      } else {
        logInfo(message);
      }
    } catch (error) {
      console.warn('Failed to log info:', error);
    }
  }

  logWarning(message: string, properties?: Record<string, string>): void {
    if (!this.isInitialized) return;
    try {
      if (properties) {
        logMessage(message, 'warning', properties, true);
      } else {
        logWarning(message);
      }
    } catch (error) {
      console.warn('Failed to log warning:', error);
    }
  }

  logError(message: string, properties?: Record<string, string>): void {
    if (!this.isInitialized) return;
    try {
      if (properties) {
        logMessage(message, 'error', properties, true);
      } else {
        logError(message);
      }
    } catch (error) {
      console.warn('Failed to log error:', error);
    }
  }

  logDebug(message: string, properties?: Record<string, string>): void {
    if (!this.isInitialized) return;
    // Debug logs go as info in RN SDK
    this.logInfo(`[DEBUG] ${message}`, properties);
  }

  logHandledError(error: Error, properties?: Record<string, string>): void {
    if (!this.isInitialized) return;
    try {
      logHandledError(error, properties || {});
    } catch (err) {
      console.warn('Failed to log handled error:', err);
    }
  }

  // ============================================
  // SPANS - Performance Monitoring
  // ============================================

  startSpan(name: string, attributes?: Record<string, string>): string | null {
    if (!this.isInitialized || !this.tracer) return null;
    try {
      const span = this.tracer.startSpan(name, {
        attributes: attributes as Record<string, string>,
      });
      const spanId = `${name}_${Date.now()}`;
      this.activeSpans.set(spanId, span);
      return spanId;
    } catch (error) {
      console.warn('Failed to start span:', error);
      return null;
    }
  }

  endSpan(spanId: string, success = true): void {
    if (!this.isInitialized) return;
    try {
      const span = this.activeSpans.get(spanId);
      if (span) {
        if (!success) {
          span.setStatus({code: SpanStatusCode.ERROR});
        }
        span.end();
        this.activeSpans.delete(spanId);
      }
    } catch (error) {
      console.warn('Failed to end span:', error);
    }
  }

  addSpanAttribute(spanId: string, key: string, value: string): void {
    if (!this.isInitialized) return;
    try {
      const span = this.activeSpans.get(spanId);
      if (span) {
        span.setAttribute(key, value);
      }
    } catch (error) {
      console.warn('Failed to add span attribute:', error);
    }
  }

  recordCompletedSpan(
    name: string,
    startTime: number,
    endTime: number,
    attributes?: Record<string, string>,
    success = true,
  ): void {
    if (!this.isInitialized || !this.tracer) return;
    try {
      recordCompletedSpan(this.tracer, name, {
        startTime: startTime,
        endTime: endTime,
        attributes: attributes as Record<string, string>,
        status: success
          ? {code: SpanStatusCode.OK}
          : {code: SpanStatusCode.ERROR},
      });
    } catch (error) {
      console.warn('Failed to record completed span:', error);
    }
  }

  // Screen view span
  startScreenViewSpan(screenName: string): string | null {
    if (!this.isInitialized || !this.tracer) return null;
    try {
      const span = startView(this.tracer, screenName);
      const spanId = `screen_${screenName}_${Date.now()}`;
      this.activeSpans.set(spanId, span);
      return spanId;
    } catch (error) {
      console.warn('Failed to start screen view span:', error);
      return null;
    }
  }

  // ============================================
  // NETWORK MONITORING
  // ============================================

  recordNetworkRequest(params: NetworkRequestParams): void {
    if (!this.isInitialized) return;
    try {
      recordNetworkRequest(
        params.url,
        params.method,
        params.startTime,
        params.endTime,
        params.bytesSent,
        params.bytesReceived,
        params.statusCode,
      );
    } catch (error) {
      console.warn('Failed to record network request:', error);
    }
  }

  recordNetworkError(params: NetworkErrorParams): void {
    if (!this.isInitialized) return;
    try {
      logNetworkClientError(
        params.url,
        params.method,
        params.startTime,
        params.endTime,
        params.errorType,
        params.errorMessage,
      );
    } catch (error) {
      console.warn('Failed to record network error:', error);
    }
  }

  // ============================================
  // USER IDENTIFICATION
  // ============================================

  setUserIdentifier(userId: string): void {
    if (!this.isInitialized) return;
    try {
      setUserIdentifier(userId);
      // Also set as permanent session property
      this.addSessionProperty('user_id', userId, true);
    } catch (error) {
      console.warn('Failed to set user identifier:', error);
    }
  }

  setUserEmail(email: string): void {
    if (!this.isInitialized) return;
    try {
      setUserEmail(email);
    } catch (error) {
      console.warn('Failed to set user email:', error);
    }
  }

  setUsername(name: string): void {
    if (!this.isInitialized) return;
    try {
      setUsername(name);
    } catch (error) {
      console.warn('Failed to set username:', error);
    }
  }

  clearUserData(): void {
    if (!this.isInitialized) return;
    try {
      clearUserIdentifier();
      clearUserEmail();
      clearUsername();
      this.removeSessionProperty('user_id');
      this.removeSessionProperty('auth_method');
    } catch (error) {
      console.warn('Failed to clear user data:', error);
    }
  }

  // ============================================
  // SESSION PROPERTIES
  // ============================================

  addSessionProperty(key: string, value: string, permanent = false): void {
    if (!this.isInitialized) return;
    try {
      addSessionProperty(key, value, permanent);
    } catch (error) {
      console.warn('Failed to add session property:', error);
    }
  }

  removeSessionProperty(key: string): void {
    if (!this.isInitialized) return;
    try {
      removeSessionProperty(key);
    } catch (error) {
      console.warn('Failed to remove session property:', error);
    }
  }

  async getSessionId(): Promise<string | null> {
    if (!this.isInitialized) return null;
    try {
      return await getCurrentSessionId();
    } catch (error) {
      console.warn('Failed to get session ID:', error);
      return null;
    }
  }

  async getDeviceId(): Promise<string | null> {
    if (!this.isInitialized) return null;
    try {
      return await getDeviceId();
    } catch (error) {
      console.warn('Failed to get device ID:', error);
      return null;
    }
  }

  endCurrentSession(): void {
    if (!this.isInitialized) return;
    try {
      endSession();
    } catch (error) {
      console.warn('Failed to end session:', error);
    }
  }

  // ============================================
  // E-COMMERCE TRACKING
  // ============================================

  // Product tracking with span
  trackProductView(info: ProductInfo): void {
    const startTime = Date.now();
    this.addBreadcrumb(`PRODUCT_VIEWED_${info.productId}`);

    const attributes: Record<string, string> = {
      'product.id': info.productId,
      'product.name': info.productName,
      'product.price': info.price.toString(),
    };
    if (info.category) {
      attributes['product.category'] = info.category;
    }

    this.recordCompletedSpan('product_view', startTime, Date.now(), attributes);
    this.logInfo('Product viewed', attributes);
  }

  // Add to cart with span
  trackAddToCart(info: CartInfo): void {
    const startTime = Date.now();
    this.addBreadcrumb(`ADD_TO_CART_${info.productId}`);

    const attributes: Record<string, string> = {
      'product.id': info.productId,
      'cart.quantity': info.quantity.toString(),
      'cart.item_value': info.price.toString(),
    };
    if (info.cartTotalItems !== undefined) {
      attributes['cart_total_items'] = info.cartTotalItems.toString();
    }
    if (info.cartSubtotal !== undefined) {
      attributes['cart_subtotal'] = info.cartSubtotal.toString();
    }

    this.recordCompletedSpan('add_to_cart', startTime, Date.now(), attributes);
    this.logInfo('Product added to cart', attributes);

    // Update session property
    if (info.cartTotalItems !== undefined) {
      this.addSessionProperty(
        'cart_item_count',
        info.cartTotalItems.toString(),
      );
    }
  }

  trackRemoveFromCart(productId: string, cartTotalItems?: number): void {
    this.addBreadcrumb(`REMOVE_FROM_CART_${productId}`);
    this.logInfo('Product removed from cart', {'product.id': productId});

    if (cartTotalItems !== undefined) {
      this.addSessionProperty('cart_item_count', cartTotalItems.toString());
    }
  }

  trackCartCleared(): void {
    this.addBreadcrumb('CART_CLEARED');
    this.logInfo('Cart cleared');
    this.addSessionProperty('cart_item_count', '0');
  }

  // Purchase tracking with spans
  trackPurchaseAttempt(info: PurchaseInfo): void {
    const startTime = Date.now();
    this.addBreadcrumb('CHECKOUT_STARTED');

    const attributes: Record<string, string> = {
      'order.id': info.orderId,
      'order.total': info.totalAmount.toString(),
      'order.item_count': info.itemCount.toString(),
    };

    this.recordCompletedSpan(
      'purchase_attempt',
      startTime,
      Date.now(),
      attributes,
    );
    this.logInfo('Purchase attempt started', attributes);
    this.addSessionProperty('current_order_id', info.orderId);
  }

  trackPurchaseSuccess(info: PurchaseInfo): void {
    const startTime = Date.now();
    this.addBreadcrumb('CHECKOUT_COMPLETED');

    const attributes: Record<string, string> = {
      'order.id': info.orderId,
      'order.total': info.totalAmount.toString(),
      'order.item_count': info.itemCount.toString(),
    };
    if (info.paymentMethod) {
      attributes['payment.method'] = info.paymentMethod;
    }

    this.recordCompletedSpan(
      'purchase_success',
      startTime,
      Date.now(),
      attributes,
    );
    this.logInfo('Purchase successful', attributes);

    this.removeSessionProperty('current_order_id');
    this.addSessionProperty('last_successful_order', info.orderId, true);
    this.addSessionProperty('cart_item_count', '0');
  }

  trackPurchaseFailure(
    orderId: string,
    errorMessage: string,
    failureReason?: string,
  ): void {
    const startTime = Date.now();
    this.addBreadcrumb('CHECKOUT_FAILED');

    const attributes: Record<string, string> = {
      'order.id': orderId,
      'error.message': errorMessage,
    };
    if (failureReason) {
      attributes['failure.reason'] = failureReason;
    }

    this.recordCompletedSpan(
      'purchase_failure',
      startTime,
      Date.now(),
      attributes,
      false,
    );
    this.logError('Purchase failed', attributes);
  }

  // Checkout step tracking
  trackCheckoutStarted(): void {
    this.addBreadcrumb('CHECKOUT_STARTED');
    this.logInfo('Checkout flow started');
  }

  trackCheckoutStep(step: number, stepName: string): void {
    this.addBreadcrumb(`CHECKOUT_STEP_${step}_${stepName.toUpperCase()}`);
    this.logInfo(`Checkout step ${step}: ${stepName}`, {
      'checkout.step': step.toString(),
      'checkout.step_name': stepName,
    });
  }

  trackCheckoutCompleted(orderId: string, total: number): void {
    this.addBreadcrumb('CHECKOUT_COMPLETED');
    this.logInfo('Checkout completed', {
      'order.id': orderId,
      'order.total': total.toString(),
    });
  }

  trackCheckoutAbandoned(step: number): void {
    this.addBreadcrumb('CHECKOUT_ABANDONED');
    this.logWarning('Checkout abandoned', {'checkout.step': step.toString()});
  }

  // Search tracking with span
  trackSearch(info: SearchInfo): void {
    const startTime = Date.now();
    this.addBreadcrumb(`SEARCH_${info.query}`);

    const attributes: Record<string, string> = {
      'search.query': info.query,
      'search.result_count': info.resultCount.toString(),
    };

    // Add filter attributes
    if (info.filters) {
      Object.entries(info.filters).forEach(([key, value]) => {
        attributes[`search.filter.${key}`] = value;
      });
    }

    this.recordCompletedSpan(
      'search_performed',
      startTime,
      Date.now(),
      attributes,
    );
    this.logInfo('Search performed', attributes);
  }

  // ============================================
  // AUTHENTICATION TRACKING
  // ============================================

  trackLoginAttempt(method: string): void {
    const startTime = Date.now();
    this.addBreadcrumb(`USER_LOGIN_STARTED_${method.toUpperCase()}`);

    this.recordCompletedSpan('login_attempt', startTime, Date.now(), {
      'auth.method': method,
    });
    this.logInfo('Login attempt started', {'auth.method': method});
  }

  trackLoginSuccess(userId: string, method: string, email?: string): void {
    const startTime = Date.now();
    this.addBreadcrumb(`USER_LOGIN_SUCCESS_${method.toUpperCase()}`);

    const attributes: Record<string, string> = {
      'auth.method': method,
      'user.id': userId,
    };
    if (email) {
      attributes['auth.email'] = email;
    }

    this.recordCompletedSpan(
      `${method.toLowerCase()}_sign_in`,
      startTime,
      Date.now(),
      attributes,
    );
    this.logInfo('Login successful', attributes);

    // Set user identification
    this.setUserIdentifier(userId);
    if (email) {
      this.setUserEmail(email);
    }
    this.addSessionProperty('auth_method', method);
    this.addSessionProperty('user_type', method === 'guest' ? 'guest' : 'registered');
  }

  trackLoginFailure(method: string, errorMessage: string): void {
    const startTime = Date.now();
    this.addBreadcrumb(`USER_LOGIN_FAILED_${method.toUpperCase()}`);

    const attributes: Record<string, string> = {
      'auth.method': method,
      'error.message': errorMessage,
    };

    this.recordCompletedSpan(
      'login_failure',
      startTime,
      Date.now(),
      attributes,
      false,
    );
    this.logError('Login failed', attributes);
  }

  trackLogout(sessionDuration?: number): void {
    this.addBreadcrumb('USER_LOGOUT');

    const attributes: Record<string, string> = {};
    if (sessionDuration !== undefined) {
      attributes['session.duration'] = sessionDuration.toString();
    }

    this.recordCompletedSpan(
      'user_sign_out',
      Date.now(),
      Date.now(),
      attributes,
    );
    this.logInfo('User logged out', attributes);
    this.clearUserData();
  }

  trackRegistration(userId: string, email: string): void {
    const startTime = Date.now();
    this.addBreadcrumb('USER_REGISTRATION_SUCCESS');

    const attributes: Record<string, string> = {
      'user.id': userId,
      'auth.email': email,
    };

    this.recordCompletedSpan(
      'email_registration',
      startTime,
      Date.now(),
      attributes,
    );
    this.logInfo('User registered', attributes);
  }

  // ============================================
  // USER ACTION TRACKING
  // ============================================

  trackUserAction(
    action: string,
    screen: string,
    properties?: Record<string, string>,
  ): void {
    const message = `${action} on ${screen}`;
    this.addBreadcrumb(`USER_ACTION_${action.toUpperCase()}`);
    this.logInfo(message, {
      action,
      screen,
      ...properties,
    });
  }

  trackScreenView(screenName: string, properties?: Record<string, string>): void {
    this.addBreadcrumb(`SCREEN_VIEW_${screenName.toUpperCase()}`);
    this.logInfo(`Screen viewed: ${screenName}`, {
      screen: screenName,
      ...properties,
    });
  }

  // ============================================
  // CRASH SIMULATION (for testing)
  // ============================================

  forceEmbraceCrash(): void {
    this.addBreadcrumb('CRASH_TEST_TRIGGERED');
    this.logError('Crash test triggered', {test_type: 'manual_crash'});

    // This will cause a crash for testing purposes
    throw new Error('Embrace crash test - this is intentional');
  }

  // ============================================
  // CI MODE - Automatic Crash Simulation
  // ============================================

  /**
   * Starts CI crash simulation if ciMode is enabled in config.
   * Approximately 20% of CI sessions will experience an intentional crash.
   * The crash occurs after a delay to allow telemetry to be generated first.
   */
  startCICrashSimulation(): void {
    if (!EMBRACE_CONFIG.ciMode) {
      return;
    }

    console.log('[CI Mode] Crash simulation enabled');
    this.addSessionProperty('ci_mode', 'enabled');

    // Calculate crash probability (20% chance)
    const crashProbabilityThreshold = 79;
    const probability = Math.floor(Math.random() * 100);
    const willCrash = probability > crashProbabilityThreshold;

    console.log(
      `[CI Mode] Crash probability roll: ${probability} (threshold: >${crashProbabilityThreshold} to crash)`,
    );

    if (willCrash) {
      this.addSessionProperty('ci_crash_scheduled', 'true');
      console.log('[CI Mode] Crash scheduled for this session');

      // Wait 20-35 seconds before crashing to allow telemetry generation
      const delayMs = 20000 + Math.floor(Math.random() * 15000);
      console.log(`[CI Mode] Crash will occur in ${delayMs / 1000} seconds`);

      setTimeout(() => {
        this.triggerCICrash();
      }, delayMs);
    } else {
      this.addSessionProperty('ci_crash_scheduled', 'false');
      console.log('[CI Mode] No crash scheduled for this session');
    }
  }

  private triggerCICrash(): void {
    console.log('[CI Mode] Triggering intentional crash now');
    this.addBreadcrumb('CI_CRASH_TRIGGERED');
    this.logError('CI automated crash test', {
      test_type: 'ci_automated_crash',
      crash_reason: 'scheduled_crash_simulation',
    });

    // Small delay to ensure logs are sent
    setTimeout(() => {
      throw new Error('CI automated crash - 20% probability crash simulation');
    }, 500);
  }

  // ============================================
  // LEGACY METHODS (for backwards compatibility)
  // ============================================

  trackProductViewed(productId: string, productName: string): void {
    this.trackProductView({
      productId,
      productName,
      price: 0,
    });
  }
}

export const embraceService = new EmbraceService();
