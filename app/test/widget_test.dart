import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hysj_app/main.dart';

void main() {
  testWidgets('App renders loading then login screen',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const HysjApp());
    // Shows loading indicator during auth check
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    // Pump a few frames to let auth check resolve (not pumpAndSettle — heart animation never settles)
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });
}
