import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {embraceService} from '../services/embrace';
import {Button} from '../components';
import {RootStackParamList} from '../navigation/types';

type ProfileNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  title,
  subtitle,
  onPress,
  showArrow = true,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      <Text style={styles.menuItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
    </View>
    {showArrow && <Text style={styles.menuItemArrow}>›</Text>}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const {user, logout, isAuthenticated} = useAuthStore();

  const handleLogin = () => {
    navigation.navigate('Auth', {});
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          embraceService.trackLogout();
        },
      },
    ]);
  };

  const handleOrderHistory = () => {
    embraceService.addBreadcrumb('VIEW_ORDER_HISTORY');
    Alert.alert('Order History', 'Order history feature coming soon!');
  };

  const handleAddresses = () => {
    embraceService.addBreadcrumb('VIEW_ADDRESSES');
    Alert.alert('Address Book', 'Address management feature coming soon!');
  };

  const handlePaymentMethods = () => {
    embraceService.addBreadcrumb('VIEW_PAYMENT_METHODS');
    Alert.alert('Payment Methods', 'Payment methods feature coming soon!');
  };

  const handleSettings = () => {
    embraceService.addBreadcrumb('VIEW_SETTINGS');
    Alert.alert('Settings', 'Settings feature coming soon!');
  };

  const handleHelp = () => {
    embraceService.addBreadcrumb('VIEW_HELP');
    Alert.alert('Help & Support', 'Help center feature coming soon!');
  };

  const handleTestError = () => {
    Alert.alert(
      'Test Error Logging',
      'This will log a test error to Embrace SDK',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log Error',
          onPress: () => {
            embraceService.logError('Test error triggered from profile screen', {
              'user.id': user?.id || 'unknown',
              timestamp: new Date().toISOString(),
              screen: 'ProfileScreen',
            });
            Alert.alert(
              'Error Logged',
              'A test error has been logged to Embrace',
            );
          },
        },
      ],
    );
  };

  const handleTestCrash = () => {
    Alert.alert(
      'Test Crash',
      'This will cause the app to crash for testing Embrace crash reporting. The app will close.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Crash App',
          style: 'destructive',
          onPress: () => {
            embraceService.forceEmbraceCrash();
          },
        },
      ],
    );
  };

  const handleShowSessionId = async () => {
    const sessionId = await embraceService.getSessionId();
    const deviceId = await embraceService.getDeviceId();
    Alert.alert(
      'Embrace Session Info',
      `Session ID:\n${sessionId || 'Not available'}\n\nDevice ID:\n${deviceId || 'Not available'}`,
    );
  };

  const handleTestSpan = () => {
    const spanId = embraceService.startSpan('test_user_action', {
      screen: 'ProfileScreen',
      action: 'test_span',
    });

    setTimeout(() => {
      if (spanId) {
        embraceService.addSpanAttribute(spanId, 'completed', 'true');
        embraceService.endSpan(spanId, true);
      }
      Alert.alert(
        'Span Recorded',
        'A test performance span was recorded to Embrace',
      );
    }, 1000);
  };

  if (!isAuthenticated()) {
    return (
      <View style={styles.notLoggedInContainer}>
        <View style={styles.notLoggedInContent}>
          <Text style={styles.notLoggedInIcon}>👤</Text>
          <Text style={styles.notLoggedInTitle}>Sign in to your account</Text>
          <Text style={styles.notLoggedInMessage}>
            Track orders, save addresses, and access exclusive deals
          </Text>
          <Button
            title="Sign In"
            onPress={handleLogin}
            style={styles.signInButton}
          />
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.createAccountText}>
              Don't have an account? <Text style={styles.link}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.userSection}>
        <Image
          source={{
            uri:
              user?.profileImageUrl ||
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest</Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem title="Order History" onPress={handleOrderHistory} />
        <MenuItem title="Saved Addresses" onPress={handleAddresses} />
        <MenuItem title="Payment Methods" onPress={handlePaymentMethods} />
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <MenuItem title="Settings" onPress={handleSettings} />
        <MenuItem title="Help & Support" onPress={handleHelp} />
      </View>

      {/* Developer Section - Embrace SDK Testing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer - Embrace SDK</Text>
        <MenuItem
          title="View Session Info"
          subtitle="Show current session and device IDs"
          onPress={handleShowSessionId}
        />
        <MenuItem
          title="Test Error Logging"
          subtitle="Log a test error to Embrace"
          onPress={handleTestError}
        />
        <MenuItem
          title="Test Performance Span"
          subtitle="Record a test span to Embrace"
          onPress={handleTestSpan}
        />
        <MenuItem
          title="Force Crash"
          subtitle="Crash the app for testing (destructive)"
          onPress={handleTestCrash}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  notLoggedInContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
  },
  notLoggedInContent: {
    alignItems: 'center',
    padding: 32,
  },
  notLoggedInIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  notLoggedInMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  signInButton: {
    minWidth: 200,
    marginBottom: 16,
  },
  createAccountText: {
    fontSize: 14,
    color: '#666',
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  guestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  guestBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  signOutSection: {
    padding: 16,
  },
  bottomPadding: {
    height: 32,
  },
});
