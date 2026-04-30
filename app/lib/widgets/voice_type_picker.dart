import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum VoiceType {
  robot,
  deep,
  high,
  whisper,
  distorted,
}

extension VoiceTypeExtension on VoiceType {
  String get label {
    switch (this) {
      case VoiceType.robot:
        return 'Robot';
      case VoiceType.deep:
        return 'Deep';
      case VoiceType.high:
        return 'High';
      case VoiceType.whisper:
        return 'Whisper';
      case VoiceType.distorted:
        return 'Distorted';
    }
  }

  IconData get icon {
    switch (this) {
      case VoiceType.robot:
        return Icons.smart_toy;
      case VoiceType.deep:
        return Icons.graphic_eq;
      case VoiceType.high:
        return Icons.music_note;
      case VoiceType.whisper:
        return Icons.volume_down;
      case VoiceType.distorted:
        return Icons.blur_on;
    }
  }
}

class VoiceTypePicker extends StatelessWidget {
  final VoiceType selected;
  final ValueChanged<VoiceType> onChanged;

  const VoiceTypePicker({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: VoiceType.values.map((type) {
        final isSelected = type == selected;
        return GestureDetector(
          onTap: () => onChanged(type),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: isSelected
                      ? Border.all(color: AppColors.primaryLight, width: 2)
                      : null,
                ),
                child: Icon(
                  type.icon,
                  color: isSelected
                      ? Colors.white
                      : AppColors.textSecondary,
                  size: 22,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                type.label,
                style: TextStyle(
                  fontSize: 10,
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.textMuted,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
