import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { updateUserById } from "../../../api";
import CustomScrollView from "../../../components/CustomScrollView";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../util/functions/parseStyles";
import { triggerToast } from "../../../util/functions/toast";

interface EditProfileProps {
  onSave: () => void;
}

// Helper component for lively icons
const LivelyIcon = ({
  name,
  color,
  bg,
}: {
  name: string;
  color: string;
  bg: string;
}) => (
  <View style={[styles.iconContainer, { backgroundColor: bg }]}>
    <Icon solid name={name} size={16} color={color} />
  </View>
);

const EditProfile = ({ onSave }: EditProfileProps) => {
  const { user, setUser } = useUserStore();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [socialLinks, setSocialLinks] = useState({
    facebook: user?.links?.social?.facebook || "",
    instagram: user?.links?.social?.instagram || "",
    whatsapp: user?.links?.social?.whatsapp || "",
  });

  const handleSave = async () => {
    if (!user) return;
    try {
      await updateUserById(user.id, {
        name,
        bio,
        phoneNumber,
        links: {
          social: {
            facebook: socialLinks.facebook,
            instagram: socialLinks.instagram,
            whatsapp: socialLinks.whatsapp,
          },
        },
      });
      triggerToast(
        "success",
        "Profile Updated",
        "Your changes have been saved successfully."
      );
      setUser({
        ...user,
        name,
        bio,
        phoneNumber,
        links: {
          social: {
            facebook: socialLinks.facebook,
            instagram: socialLinks.instagram,
            whatsapp: socialLinks.whatsapp,
          },
        },
      });
      onSave();
    } catch (error) {
      triggerToast("Error", "Update Failed", "Could not update profile.");
      console.error(error);
    }
  };

  return (
    <CustomScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Edit Profile</Text>
      </View>

      {/* Personal Info Card */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeader}>
          <LivelyIcon name="user-edit" color="#EA580C" bg="#FFF7ED" />
          <Text style={styles.sectionTitle}>Personal Details</Text>
        </View>

        <View style={styles.inputGroup}>
          <View>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Bio</Text>
            <View style={[styles.inputWrapper, styles.bioInputWrapper]}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a bit about yourself..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.bioInput]}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+91-XXXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Social Links Card */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeader}>
          <LivelyIcon name="share-alt" color="#10B981" bg="#ECFDF5" />
          <Text style={styles.sectionTitle}>Social Links</Text>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.socialRow}>
            <View style={[styles.socialIcon, { backgroundColor: "#EFF6FF" }]}>
              <Icon name="facebook-f" size={16} color="#2563EB" />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                value={socialLinks.facebook}
                onChangeText={(text) =>
                  setSocialLinks((prev) => ({ ...prev, facebook: text }))
                }
                placeholder="Facebook Profile URL"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.socialRow}>
            <View style={[styles.socialIcon, { backgroundColor: "#FDF2F8" }]}>
              <Icon name="instagram" size={16} color="#DB2777" />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                value={socialLinks.instagram}
                onChangeText={(text) =>
                  setSocialLinks((prev) => ({ ...prev, instagram: text }))
                }
                placeholder="Instagram Profile URL"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.socialRow}>
            <View style={[styles.socialIcon, { backgroundColor: "#F0FDF4" }]}>
              <Icon name="whatsapp" size={16} color="#16A34A" />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                value={socialLinks.whatsapp}
                onChangeText={(text) =>
                  setSocialLinks((prev) => ({ ...prev, whatsapp: text }))
                }
                placeholder="WhatsApp Number / URL"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSave}
          style={styles.saveButtonWrapper}
        >
          <LinearGradient
            colors={["#fb923c", "#ea580c"]} // Orange gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
            <Icon name="check" size={16} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSave} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </CustomScrollView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  inputGroup: {
    gap: 16,
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: "#F8FAFC", // Light slate bg
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
    flex: 1,
  },
  bioInputWrapper: {
    height: 120,
    paddingVertical: 12,
    justifyContent: "flex-start",
  },
  input: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "500",
  },
  bioInput: {
    textAlignVertical: "top", // Android fix
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContainer: {
    marginTop: 12,
    gap: 16,
  },
  saveButtonWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cancelButton: {
    alignItems: "center",
    padding: 12,
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
});
