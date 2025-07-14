import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RoutinesScreen } from '../screens/RoutinesScreen';
import { DayTemplateTasksScreen } from '../screens/DayTemplateTasksScreen';
import { WeekTemplateDaysScreen } from '../screens/WeekTemplateDaysScreen';

export type RoutinesStackParamList = {
  RoutinesList: undefined;
  DayTemplateTasks: {
    templateId: string;
    templateName: string;
  };
  WeekTemplateDays: {
    templateId: string;
    templateName: string;
  };
};

const Stack = createStackNavigator<RoutinesStackParamList>();

export const RoutinesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RoutinesList" component={RoutinesScreen} />
      <Stack.Screen name="DayTemplateTasks" component={DayTemplateTasksScreen} />
      <Stack.Screen name="WeekTemplateDays" component={WeekTemplateDaysScreen} />
    </Stack.Navigator>
  );
};