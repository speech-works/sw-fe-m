import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { updateUserById } from "../../../api";
import { useUserStore } from "../../../stores/user";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../../util/functions/bottomSheet";
import {
  useTheme,
  spacing,
  radius,
  TextField,
  Button,
  SectionHeader,
} from "../../../design-system";

interface EditProfileProps {
  onSave: () => void;
}

const EditProfile = ({ onSave }: EditProfileProps) => {
  const { colors } = useTheme();
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
      showSuccessBottomSheet(
        "Profile Updated",
        "Your changes have been saved successfully.",
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
      showErrorBottomSheet("Update Failed", "Could not update profile.");
      console.error(error);
    }
  };

  const socialRow = (
    icon: string,
    value: string,
    placeholder: string,
    onChangeText: (t: string) => void,
  ) => (
    <View style={styles.socialRow}>
      <View style={[styles.socialIcon, { backgroundColor: colors.surface.control }]}>
        <FAIcon name={icon} size={16} color={colors.text.primary} />
      </View>
      <View style={styles.flex1}>
        <TextField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Personal Details */}
      <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
        <SectionHeader icon="user" title="Personal Details" />
        <View style={styles.inputGroup}>
          <TextField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us a bit about yourself..."
            multiline
            numberOfLines={4}
          />
          <TextField
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+91-XXXXXX"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Social Links */}
      <View style={[styles.card, { backgroundColor: colors.surface.default }]}>
        <SectionHeader icon="share-2" title="Social Links" />
        <View style={styles.inputGroup}>
          {socialRow("facebook-f", socialLinks.facebook, "Facebook Profile URL", (t) =>
            setSocialLinks((prev) => ({ ...prev, facebook: t })),
          )}
          {socialRow("instagram", socialLinks.instagram, "Instagram Profile URL", (t) =>
            setSocialLinks((prev) => ({ ...prev, instagram: t })),
          )}
          {socialRow("whatsapp", socialLinks.whatsapp, "WhatsApp Number / URL", (t) =>
            setSocialLinks((prev) => ({ ...prev, whatsapp: t })),
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <Button label="Save Changes" onPress={handleSave} />
        <Button label="Cancel" variant="ghost" onPress={onSave} />
      </View>
    </View>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: spacing.xl,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  inputGroup: {
    gap: spacing.lg,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  flex1: {
    flex: 1,
  },
  actionContainer: {
    gap: spacing.md,
  },
});
