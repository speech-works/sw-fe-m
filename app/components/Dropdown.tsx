import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens"; // Adjust path if needed
import { parseTextStyle } from "../util/functions/parseStyles";

interface DropdownProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  labelExtractor: (item: T) => string;
  selected: T | null;
  onSelect: (item: T) => void;
  placeholder?: string;
}

function Dropdown<T>({
  data,
  keyExtractor,
  labelExtractor,
  selected,
  onSelect,
  placeholder = "Select an option",
}: DropdownProps<T>) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (item: T) => {
    onSelect(item);
    setVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.dropdownText}>
          {selected ? labelExtractor(selected) : placeholder}
        </Text>
        <Icon name="chevron-down" size={12} color={theme.colors.text.default} />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={data}
              keyExtractor={keyExtractor}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>{labelExtractor(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default Dropdown;

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface.default,
  },
  dropdownText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    paddingVertical: 12,
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
