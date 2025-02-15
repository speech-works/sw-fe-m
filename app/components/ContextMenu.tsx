import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  UIManager,
  findNodeHandle,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../Theme/tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ContextMenuProps {
  options: { label: string; onPress: () => void }[];
}

const ContextMenu: React.FC<ContextMenuProps> = ({ options }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<View | null>(null);

  const openMenu = () => {
    if (buttonRef.current) {
      const handle = findNodeHandle(buttonRef.current);
      if (handle) {
        UIManager.measure(handle, (_fx, _fy, _width, _height, px, py) => {
          // Ensure menu doesn't go out of bounds
          const menuWidth = 150;
          const menuHeight = 120;

          setPosition({
            x: Math.min(px, SCREEN_WIDTH - menuWidth), // Keep menu within screen
            y: Math.min(py + 30, SCREEN_HEIGHT - menuHeight), // Offset below button
          });
          setIsVisible(true);
        });
      }
    }
  };

  const closeMenu = () => setIsVisible(false);

  return (
    <View>
      {/* Three-dot button */}
      <TouchableOpacity
        ref={buttonRef}
        style={styles.button}
        onPress={openMenu}
      >
        <Icon name="more-vert" size={20} color={theme.colors.neutral[5]} />
      </TouchableOpacity>

      {/* Context Menu Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={[styles.menu, { top: position.y, left: position.x }]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  option.onPress();
                  closeMenu();
                }}
              >
                <Text style={styles.menuText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    // padding: 10,
    // backgroundColor: "black",
    // borderRadius: 8,
    // alignSelf: "flex-start", // Ensures the button stays in place
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menu: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: 150,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuText: {
    fontSize: 16,
    color: "black",
  },
});

export default ContextMenu;
