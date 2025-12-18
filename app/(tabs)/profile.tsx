import React from 'react';
import { StyleSheet, ScrollView, View, Platform, StatusBar } from 'react-native';
import { Card, Text, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon
          icon="information"
          size={80}
          style={styles.headerIcon}
        />
        <Text variant="headlineLarge" style={styles.headerTitle}>
          À propos
        </Text>
        <Text variant="bodyLarge" style={styles.headerSubtitle}>
          Connecter les croyants, partager la foi
        </Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon icon="target" size={40} style={styles.cardIcon} />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Notre Mission
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Cette application a pour but de faciliter la communion entre chrétiens et de soutenir l'évangélisation à travers le monde.
            </Text>
            <Text variant="bodyMedium" style={styles.cardText}>
              Nous croyons que la technologie peut être un outil puissant pour rassembler le corps de Christ et partager la bonne nouvelle de l'Évangile.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon icon="heart" size={40} style={styles.cardIcon} />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Notre Vision
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Nous visons à créer une plateforme qui permet aux églises et aux croyants de :
            </Text>
            <View style={styles.visionList}>
              <View style={styles.visionItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                <Text variant="bodyMedium" style={styles.visionText}>
                  Découvrir des églises à proximité
                </Text>
              </View>
              <View style={styles.visionItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                <Text variant="bodyMedium" style={styles.visionText}>
                  Participer à des événements chrétiens
                </Text>
              </View>
              <View style={styles.visionItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                <Text variant="bodyMedium" style={styles.visionText}>
                  S'engager dans l'évangélisation
                </Text>
              </View>
              <View style={styles.visionItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                <Text variant="bodyMedium" style={styles.visionText}>
                  Renforcer la communion fraternelle
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon icon="church" size={40} style={styles.cardIcon} />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Pour les Églises
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Les églises peuvent utiliser cette application pour :
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="calendar-plus" size={24} color="#6366F1" />
                <View style={styles.featureTextContainer}>
                  <Text variant="titleSmall" style={styles.featureTitle}>
                    Créer des événements
                  </Text>
                  <Text variant="bodySmall" style={styles.featureDescription}>
                    Baptêmes, réunions de prière, campagnes d'évangélisation, concerts de louange...
                  </Text>
                </View>
              </View>
              <Divider style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="account-group" size={24} color="#6366F1" />
                <View style={styles.featureTextContainer}>
                  <Text variant="titleSmall" style={styles.featureTitle}>
                    Toucher plus de personnes
                  </Text>
                  <Text variant="bodySmall" style={styles.featureDescription}>
                    Rendre vos événements visibles à tous les chrétiens de votre région et au-delà
                  </Text>
                </View>
              </View>
              <Divider style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="share-variant" size={24} color="#6366F1" />
                <View style={styles.featureTextContainer}>
                  <Text variant="titleSmall" style={styles.featureTitle}>
                    Partager votre vision
                  </Text>
                  <Text variant="bodySmall" style={styles.featureDescription}>
                    Communiquer votre mission et vos valeurs à la communauté
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon icon="account-multiple" size={40} style={styles.cardIcon} />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Comment Participer ?
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              À terme, les églises et les personnes autorisées auront accès à une interface d'administration pour :
            </Text>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text variant="bodyMedium" style={styles.stepText}>
                  Créer, modifier et supprimer des événements
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text variant="bodyMedium" style={styles.stepText}>
                  Ajouter des informations sur les lieux (location de salle, etc.)
                </Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text variant="bodyMedium" style={styles.stepText}>
                  Définir le type d'événement et gérer les inscriptions
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Avatar.Icon icon="cross" size={40} style={styles.cardIcon} />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Notre Fondement
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.verseText}>
              "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit, et enseignez-leur à observer tout ce que je vous ai prescrit."
            </Text>
            <Text variant="bodySmall" style={styles.verseReference}>
              — Matthieu 28:19-20
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Version 1.0.0
          </Text>
          <Text variant="bodySmall" style={styles.footerText}>
            Fait avec ❤️ pour la gloire de Dieu
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 80 : (StatusBar.currentHeight || 0) + 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  headerIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardIcon: {
    backgroundColor: '#EEF2FF',
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  cardText: {
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  visionList: {
    gap: 12,
    marginTop: 8,
  },
  visionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visionText: {
    color: '#475569',
    flex: 1,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#64748B',
    lineHeight: 18,
  },
  featureDivider: {
    marginVertical: 4,
  },
  stepsList: {
    gap: 16,
    marginTop: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepText: {
    color: '#475569',
    flex: 1,
  },
  verseText: {
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  verseReference: {
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    color: '#94A3B8',
  },
});
