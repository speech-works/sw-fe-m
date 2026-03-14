import React, { useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ScreenView from "../../components/ScreenView";

const { width, height } = Dimensions.get("window");

const RED_COLOR = "#FF5858";

const Community = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const pages = [
    {
      title: "Peer Support Feed",
      description:
        "Share your journey, vent, or celebrate wins with others who understand. Join a supportive space built for real conversations.",
      icon: "chat-processing",
    },
    {
      title: "Live Voice Rooms",
      description:
        "Connect in real-time. Join live audio discussion rooms to practice techniques or simply chat with the community.",
      icon: "microphone",
    },
    {
      title: "Challenges & Growth",
      description:
        "Participate in weekly speech challenges and discover career opportunities tailored for our community.",
      icon: "trophy",
    },
  ];

  return (
    <ScreenView style={styles.screenView}>
      {/* FIXED BACKGROUND LAYER */}
      <View style={styles.fixedBackgroundContainer}>
        <View style={styles.fixedRedBlock}>
          {/* Static decorative circles matching reference */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>
      </View>

      {/* SLIDING CONTENT LAYER */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          if (index !== activeIndex) setActiveIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {pages.map((page, i) => (
          <View key={i} style={styles.page}>
            {/* Top Illustration (Moves) */}
            <View style={styles.topContainer}>
              <View style={styles.illustrationPlaceholder}>
                <Icon name={page.icon} size={150} color="#E2E8F0" />
              </View>
            </View>

            {/* Bottom Content Area (Transparent container, Text moves) */}
            <View style={styles.bottomContainer}>
              <View style={styles.content}>
                <View style={styles.textContent}>
                  <Text style={styles.title}>{page.title}</Text>
                  <Text style={styles.description}>{page.description}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FIXED PAGINATION MARKERS */}
      <View style={styles.fixedMarkersContainer}>
        <View style={styles.markers}>
          {pages.map((_, dotIdx) => (
            <View
              key={dotIdx}
              style={[
                styles.marker,
                activeIndex === dotIdx
                  ? styles.markerActive
                  : styles.markerInactive,
              ]}
            />
          ))}
        </View>
      </View>
    </ScreenView>
  );
};

export default Community;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  fixedBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  fixedRedBlock: {
    position: "absolute",
    bottom: 0,
    width: width,
    height: "55%",
    backgroundColor: RED_COLOR,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  page: { width: width, height: height },
  topContainer: {
    height: "45%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  illustrationPlaceholder: {
    width: width * 0.8,
    height: 180,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomContainer: {
    height: "55%",
    backgroundColor: "transparent",
  },
  circle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -50,
    left: -80,
  },
  circle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 40,
    right: -40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 110, // Clear floating tab bar (menu dock)
  },
  textContent: {
    paddingHorizontal: 50,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.9,
  },
  buttonText: {
    color: RED_COLOR,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  fixedMarkersContainer: {
    position: "absolute",
    bottom: 15, // Below the menu dock
    width: "100%",
    alignItems: "center",
  },
  markers: {
    flexDirection: "row",
    gap: 12,
  },
  marker: {
    height: 6,
    borderRadius: 3,
  },
  markerActive: {
    width: 28,
    backgroundColor: "#FFF",
  },
  markerInactive: {
    width: 10,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
