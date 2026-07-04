import { useCallback, useRef, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  ButtonText,
  Input,
  InputField,
  Pressable,
  Divider,
  Switch,
} from '@gluestack-ui/themed';
import { DEFAULT_CATEGORIES } from '@country-city/shared';
import type { Room, RoomSettings } from '@country-city/shared';
import { updateRoomSettings } from '../../lib/api';
import { useUserStore } from '../../stores/userStore';
import { categoryLabel } from '../../lib/categories';
import { SCREEN_H_PAD } from '../../lib/layout';

const BRAND = '$primary500';
const EN_POOL = 'ABCDEFGHIJKLMNOPRSTW'.split('');

// ── Helpers ────────────────────────────────────────────────────────

function isDefaultCategory(id: string): boolean {
  return DEFAULT_CATEGORIES.some((c) => c.id === id);
}

// ── Props ──────────────────────────────────────────────────────────

interface Props {
  room: Room;
  visible: boolean;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export function RoomSettingsModal({ room, visible, onClose }: Props) {
  const token = useUserStore((s) => s.token);
  const [settings, setSettings] = useState<RoomSettings>(room.settings);

  // ── Debounced sync ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sync = useCallback(
    (patch: Partial<RoomSettings>) => {
      const merged = { ...settingsRef.current, ...patch };
      setSettings(merged);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateRoomSettings(room.code, token, merged).catch((err) =>
          console.warn('[settings] sync failed:', err),
        );
      }, 400);
    },
    [room.code, token],
  );

  // ── Reset local state when modal opens ──
  const handleOpen = useCallback(() => {
    setSettings(room.settings);
  }, [room.settings]);

  // ── Category actions ──

  function toggleCategory(catId: string) {
    const current = settings.categories;
    const included = current.includes(catId);
    if (included && current.length <= 1) return;
    const next = included
      ? current.filter((id) => id !== catId)
      : [...current, catId];
    sync({ categories: next });
  }

  function moveCategory(from: number, to: number) {
    const cats = [...settings.categories];
    if (to < 0 || to >= cats.length) return;
    const [removed] = cats.splice(from, 1);
    cats.splice(to, 0, removed);
    sync({ categories: cats });
  }

  function addCustomCategory(label: string) {
    if (!label) return;
    if (
      settings.categories.includes(label) ||
      settings.customCategories.includes(label)
    ) {
      return;
    }
    sync({
      categories: [...settings.categories, label],
      customCategories: [...settings.customCategories, label],
    });
  }

  function removeCustomCategory(label: string) {
    if (settings.categories.length <= 1) return;
    sync({
      categories: settings.categories.filter((id) => id !== label),
      customCategories: settings.customCategories.filter((c) => c !== label),
    });
  }

  function toggleSkipLetter(letter: string) {
    const next = settings.skipLetters.includes(letter)
      ? settings.skipLetters.filter((l) => l !== letter)
      : [...settings.skipLetters, letter];
    sync({ skipLetters: next });
  }

  function updateSetting<K extends keyof RoomSettings>(
    key: K,
    value: RoomSettings[K],
  ) {
    sync({ [key]: value });
  }

  const language = settings.language ?? 'en';
  const catList = settings.categories;
  const [customInput, setCustomInput] = useState('');

  function handleAddCustom() {
    const label = customInput.trim();
    if (!label) return;
    addCustomCategory(label);
    setCustomInput('');
  }

  // ── Rounds stepper ──
  function decRounds() {
    const cur = settings.maxRounds;
    if (cur === null) updateSetting('maxRounds', 10);
    else if (cur > 1) updateSetting('maxRounds', cur - 1);
  }
  function incRounds() {
    const cur = settings.maxRounds;
    if (cur === null) updateSetting('maxRounds', 1);
    else if (cur < 10) updateSetting('maxRounds', cur + 1);
    else updateSetting('maxRounds', null);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Box flex={1} bg="$backgroundLight50">
        {/* ── Header ─────────────────────────────────────── */}
        <Box bg="$white" borderBottomWidth={1} borderBottomColor="$borderLight200">
          <HStack
            px={SCREEN_H_PAD}
            pt={56}
            pb={16}
            alignItems="center"
            justifyContent="space-between"
          >
            <Pressable onPress={onClose} p="$2" ml={-8}>
              <Text size="xl" color={BRAND}>✕</Text>
            </Pressable>
            <Heading size="md" color="$textLight900">
              Game Settings
            </Heading>
            <Box w={40} />
          </HStack>
        </Box>

        <ScrollView showsVerticalScrollIndicator={false}>
          <VStack px={SCREEN_H_PAD} py="$6" space="xl">
            {/* ── Categories ──────────────────────────── */}
            <Box bg="$white" borderRadius="$2xl" p="$5">
              <Heading size="sm" color="$textLight900" mb="$4">
                Categories
              </Heading>

              <VStack space="xs">
                {catList.map((catId, idx) => {
                  const isDefault = isDefaultCategory(catId);
                  const isLast = catList.length <= 1;

                  return (
                    <HStack key={catId} alignItems="center" space="sm" py="$2">
                      {/* Reorder arrows */}
                      <VStack space="xs" mr="$1">
                        <Pressable
                          onPress={() => moveCategory(idx, idx - 1)}
                          isDisabled={idx === 0}
                          p="$1"
                          opacity={idx === 0 ? 0.25 : 1}
                        >
                          <Text size="xs" color="$textLight500">▲</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => moveCategory(idx, idx + 1)}
                          isDisabled={idx === catList.length - 1}
                          p="$1"
                          opacity={idx === catList.length - 1 ? 0.25 : 1}
                        >
                          <Text size="xs" color="$textLight500">▼</Text>
                        </Pressable>
                      </VStack>

                      <Text
                        flex={1}
                        fontWeight="$medium"
                        color="$textLight900"
                        numberOfLines={1}
                      >
                        {categoryLabel(catId, language)}
                      </Text>

                      {isDefault ? (
                        <Switch
                          value={true}
                          onToggle={() => toggleCategory(catId)}
                          isDisabled={isLast}
                          trackColor={{ true: '#3D2FCF' } as any}
                        />
                      ) : (
                        <Pressable
                          onPress={() => removeCustomCategory(catId)}
                          isDisabled={isLast}
                          p="$2"
                          opacity={isLast ? 0.25 : 1}
                        >
                          <Text size="sm" color="$red500" fontWeight="$bold">✕</Text>
                        </Pressable>
                      )}
                    </HStack>
                  );
                })}

                <Divider bg="$borderLight100" my="$1" />

                {/* Inactive default categories */}
                {DEFAULT_CATEGORIES.filter(
                  (c) => !catList.includes(c.id),
                ).map((cat) => (
                  <HStack
                    key={cat.id}
                    alignItems="center"
                    space="sm"
                    py="$2"
                    opacity={0.45}
                  >
                    <Box w={32} />
                    <Text
                      flex={1}
                      fontWeight="$medium"
                      color="$textLight400"
                      numberOfLines={1}
                    >
                      {categoryLabel(cat.id, language)}
                    </Text>
                    <Switch
                      value={false}
                      onToggle={() => toggleCategory(cat.id)}
                      trackColor={{ true: '#3D2FCF' } as any}
                    />
                  </HStack>
                ))}

                {/* Add custom category */}
                <HStack mt="$3" space="sm" alignItems="center">
                  <Input flex={1} size="sm" borderRadius="$lg" borderColor="$borderLight200">
                    <InputField
                      placeholder="Add a custom category…"
                      value={customInput}
                      onChangeText={setCustomInput}
                      autoCorrect={false}
                      maxLength={30}
                      returnKeyType="done"
                      onSubmitEditing={handleAddCustom}
                    />
                  </Input>
                  <Button
                    size="sm"
                    borderRadius="$lg"
                    bg={BRAND}
                    isDisabled={!customInput.trim()}
                    onPress={handleAddCustom}
                    sx={{ ':disabled': { opacity: 0.4 } }}
                  >
                    <ButtonText fontSize="$sm" fontWeight="$bold">Add</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Box>

            {/* ── Game Settings ───────────────────────── */}
            <Box bg="$white" borderRadius="$2xl" p="$5">
              <Heading size="sm" color="$textLight900" mb="$4">
                Rules
              </Heading>

              <VStack space="lg">
                {/* Rounds */}
                <VStack space="sm">
                  <Text size="sm" fontWeight="$semibold" color="$textLight900">
                    Number of rounds
                  </Text>
                  <HStack alignItems="center" space="md">
                    <Pressable
                      onPress={decRounds}
                      bg="$borderLight100"
                      borderRadius="$lg"
                      w={40}
                      h={40}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ ':active': { bg: '$borderLight200' } }}
                    >
                      <Text fontWeight="$bold" color="$textLight900">−</Text>
                    </Pressable>

                    <Box
                      minWidth={60}
                      alignItems="center"
                      bg="$primary50"
                      borderRadius="$lg"
                      px="$4"
                      py="$2"
                    >
                      <Text fontWeight="$extrabold" color={BRAND}>
                        {settings.maxRounds === null ? '∞' : settings.maxRounds}
                      </Text>
                    </Box>

                    <Pressable
                      onPress={incRounds}
                      bg="$borderLight100"
                      borderRadius="$lg"
                      w={40}
                      h={40}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ ':active': { bg: '$borderLight200' } }}
                    >
                      <Text fontWeight="$bold" color="$textLight900">+</Text>
                    </Pressable>

                    <Text size="xs" color="$textLight400">
                      (10+ → unlimited)
                    </Text>
                  </HStack>
                </VStack>

                <Divider bg="$borderLight100" />

                {/* Countdown */}
                <VStack space="sm">
                  <Text size="sm" fontWeight="$semibold" color="$textLight900">
                    Countdown timer
                  </Text>
                  <HStack space="sm" flexWrap="wrap">
                    {[30, 60, 90, 120].map((sec) => {
                      const active = settings.extraTimeSeconds === sec;
                      return (
                        <Pressable
                          key={sec}
                          onPress={() => updateSetting('extraTimeSeconds', sec)}
                          bg={active ? '$primary500' : '$borderLight100'}
                          borderRadius="$lg"
                          px="$4"
                          py="$2"
                          sx={{ ':active': { opacity: 0.7 } }}
                        >
                          <Text
                            fontWeight="$bold"
                            color={active ? '$white' : '$textLight700'}
                          >
                            {sec}s
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </VStack>

                <Divider bg="$borderLight100" />

                {/* Multiple answers */}
                <HStack justifyContent="space-between" alignItems="center">
                  <Text size="sm" fontWeight="$semibold" color="$textLight900">
                    Allow multiple answers
                  </Text>
                  <Switch
                    value={settings.allowMultipleAnswers}
                    onToggle={() =>
                      updateSetting(
                        'allowMultipleAnswers',
                        !settings.allowMultipleAnswers,
                      )
                    }
                    trackColor={{ true: '#3D2FCF' } as any}
                  />
                </HStack>

                <Divider bg="$borderLight100" />

                {/* Skip letters */}
                <VStack space="sm">
                  <Text size="sm" fontWeight="$semibold" color="$textLight900">
                    Skip letters
                  </Text>
                  <Text size="xs" color="$textLight400">
                    Tap a letter to exclude it
                  </Text>
                  <HStack flexWrap="wrap" style={{ gap: 6 }}>
                    {EN_POOL.map((letter) => {
                      const skipped = settings.skipLetters.includes(letter);
                      return (
                        <Pressable
                          key={letter}
                          onPress={() => toggleSkipLetter(letter)}
                          bg={skipped ? '$red100' : '$primary50'}
                          borderRadius="$lg"
                          w={36}
                          h={36}
                          alignItems="center"
                          justifyContent="center"
                          borderWidth={skipped ? 1 : 0}
                          borderColor={skipped ? '$red400' : 'transparent'}
                          sx={{ ':active': { opacity: 0.7 } }}
                        >
                          <Text
                            fontWeight="$bold"
                            color={skipped ? '$red500' : '$primary500'}
                            style={
                              skipped
                                ? { textDecorationLine: 'line-through' }
                                : undefined
                            }
                          >
                            {letter}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>

        {/* ── Footer ───────────────────────────────────── */}
        <Box bg="$white" borderTopWidth={1} borderTopColor="$borderLight200">
          <VStack px={SCREEN_H_PAD} pt="$4" pb="$9">
            <Button
              size="lg"
              borderRadius="$xl"
              bg={BRAND}
              onPress={onClose}
              sx={{ ':active': { bg: '$primary600' } }}
            >
              <ButtonText fontWeight="$bold">Done</ButtonText>
            </Button>
          </VStack>
        </Box>
      </Box>
    </Modal>
  );
}
