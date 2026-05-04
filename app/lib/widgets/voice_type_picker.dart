import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

enum VoiceType { natural, robot, deep, high, echo }

extension VoiceTypeExtension on VoiceType {
  String get label => switch (this) {
        VoiceType.natural => 'Natural',
        VoiceType.robot => 'Robot',
        VoiceType.deep => 'Deep',
        VoiceType.high => 'High',
        VoiceType.echo => 'Echo',
      };

  String get emoji => switch (this) {
        VoiceType.natural => '',
        VoiceType.robot => '\u{1F916}',
        VoiceType.deep => '\u{26A1}',
        VoiceType.high => '\u{1F388}',
        VoiceType.echo => '\u{1F30A}',
      };
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
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: VoiceType.values.map((type) {
              final isSelected = type == selected;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => onChanged(type),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? HysjColors.cobalt : Colors.transparent,
                      borderRadius: BorderRadius.circular(HysjSpacing.pillRadius),
                      border: Border.all(
                        color: isSelected ? HysjColors.cobalt : HysjColors.dLine,
                      ),
                    ),
                    child: Text(
                      type.emoji.isEmpty ? type.label : '${type.emoji} ${type.label}',
                      style: HysjTypo.body(
                        size: 13,
                        color: isSelected ? Colors.white : HysjColors.dText2,
                        weight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'VOICE EFFECTS \u00B7 SLIDE LEFT TO CANCEL',
          style: HysjTypo.label(size: 9, color: HysjColors.dText3),
        ),
      ],
    );
  }
}
