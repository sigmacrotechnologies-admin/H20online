import React from "react";
import { View, Text, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { modern } from "./modernStyles";

export default function ModernInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = "#9CA3AF",
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
  onFocus,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  style,
  containerStyle,
}) {
  return (
    <View style={[modern.inputSection, style]}>
      {label ? <Text style={modern.label}>{label}</Text> : null}
      <View style={[modern.inputContainer, containerStyle]}>
        {icon ? <Ionicons name={icon} size={20} color="#6B7C85" style={modern.inputIcon} /> : null}
        <TextInput
          style={modern.input}
          underlineColorAndroid="transparent"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
        />
      </View>
    </View>
  );
}
