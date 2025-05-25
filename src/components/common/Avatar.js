import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/theme';

const Avatar = ({
  source,
  size = 40,
  onPress,
  style,
  showEditIcon = false,
  editIconSize = 16,
  editIconColor = colors.primary,
  ...props
}) => {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <View style={[styles.container, style]}>
      <Container onPress={onPress} style={avatarStyle} {...props}>
        {source?.uri ? (
          <Image
            source={source}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: size / 2,
            }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={size * 0.6} color="#666" />
        )}
      </Container>
      
      {showEditIcon && (
        <View style={[styles.editIcon, { borderColor: editIconColor }]}>
          <Ionicons name="pencil" size={editIconSize * 0.6} color={editIconColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  editIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
});

export default Avatar;
