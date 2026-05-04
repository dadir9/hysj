import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hysj_app/main.dart';

void main() {
  testWidgets('App renders login screen when not logged in',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const HysjApp());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    // Login screen uses RichText for "Welcome back."
    expect(find.byType(RichText), findsWidgets);
    // Phone input should be present
    expect(find.byType(TextField), findsWidgets);
  });
}
