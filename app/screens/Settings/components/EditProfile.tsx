import { StyleSheet, Text, View, ScrollView } from "react-native";
import React, { useState } from "react";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import TextArea from "../../../components/TextArea";
import Button from "../../../components/Button";
import CustomScrollView from "../../../components/CustomScrollView";
import { updateUserById } from "../../../api";
import { triggerToast } from "../../../util/functions/toast";

interface EditProfileProps {
  onSave: () => void;
}

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
      "Profile update",
      "Your profile has been updated successfully."
    );
    setUser({
      ...user,
      id: user?.id ?? "",
      name,
      bio,
      email: user?.email || "",
      profilePictureUrl: user?.profilePictureUrl || "",
      phoneNumber,
      links: {
        social: {
          facebook: socialLinks.facebook,
          instagram: socialLinks.instagram,
          whatsapp: socialLinks.whatsapp,
        },
      },
      dob: user?.dob || undefined,
    });
    onSave();
  };

  return (
    <CustomScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextArea
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          numberOfLines={1}
          multiline
          inputStyle={styles.input}
          containerStyle={styles.textAreaContainer}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        <TextArea
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us something about you"
          numberOfLines={4}
          multiline
          inputStyle={[styles.input, styles.bioInput]}
          containerStyle={{
            ...styles.textAreaContainer,
            ...styles.bioContainer,
          }}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Phone Number</Text>
        <TextArea
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+91-XXXXXX"
          numberOfLines={1}
          multiline
          inputStyle={styles.input}
          containerStyle={styles.textAreaContainer}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={styles.sectionHeader}>Social Links</Text>

      {Object.entries(socialLinks).map(([platform, value]) => (
        <View key={platform} style={styles.socialRow}>
          <Icon name={platform} size={16} color={theme.colors.text.title} />
          <TextArea
            value={value}
            onChangeText={(text) =>
              setSocialLinks((prev) => ({ ...prev, [platform]: text }))
            }
            placeholder={`Enter ${platform} link`}
            numberOfLines={2}
            multiline
            inputStyle={styles.input}
            containerStyle={{
              ...styles.textAreaContainer,
              ...styles.socialInput,
            }}
          />
        </View>
      ))}

      <Button
        text="Save Changes"
        onPress={handleSave}
        style={styles.saveButton}
      />
    </CustomScrollView>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  header: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
  },
  section: {
    gap: 8,
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  sectionHeader: {
    ...parseTextStyle(theme.typography.Heading3),
    marginTop: 24,
    color: theme.colors.text.title,
  },
  textAreaContainer: {
    backgroundColor: theme.colors.background.default,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
  },
  input: {
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    padding: 0,
  },
  bioInput: {
    lineHeight: 22,
  },
  bioContainer: {
    minHeight: 100,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  socialInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 32,
  },
});
