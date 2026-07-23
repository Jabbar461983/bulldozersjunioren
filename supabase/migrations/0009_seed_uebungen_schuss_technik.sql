-- Seed-Übungen für die Kategorien "Schuss" und "Technik".
-- Gleiches Muster wie Migration 0008: jede Übung gilt für alle vier
-- Altersgruppen (U9/U12/U15/U18), die altersabhängige Wiederholungszahl steht
-- im Beschreibungstext. Kein Bild vorhanden (bild_url/video_url bleiben
-- leer), kein bestimmter Ersteller (erstellt_von bleibt leer).

insert into public.uebungen (titel, beschreibung, kategorie, altersgruppen)
values
  ('Handgelenkschuss', 'Ball mit Schlägerblatt durch Abrollen des Handgelenks aufs Tor schiessen. U9: 8, U12: 12, U15: 16, U18: 20 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Schlagschuss', 'Schläger weit ausholen, Ball mit vollem Schwung kraftvoll aufs Tor schlagen. U9: 6, U12: 10, U15: 14, U18: 18 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Ziel-Ecken', 'Auf markierte Torecken zielen, Treffer zählen. U9: 8, U12: 12, U15: 16, U18: 20 Versuche.', 'schuss', '{U9,U12,U15,U18}'),
  ('Direktschuss', 'Zugespielten Ball ohne Ballannahme direkt aufs Tor schiessen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Rückhandschuss', 'Ball aus der Rückhand kontrolliert aufs Tor schiessen. U9: 8, U12: 12, U15: 16, U18: 20 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Schuss aus Bewegung', 'Im Laufen den Ball annehmen und sofort aufs Tor schiessen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Distanzschuss', 'Aus grösserer Entfernung kraftvoll und präzise aufs Tor schiessen. U9: 6, U12: 10, U15: 14, U18: 18 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Fake-Schuss', 'Schussbewegung antäuschen, dann verzögert tatsächlich schiessen. U9: 5, U12: 8, U15: 12, U18: 15 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Pass-Schuss-Kombo', 'Pass von Partner annehmen und in einer Bewegung aufs Tor schiessen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Schuss unter Druck', 'Mit einem Verteidiger im Rücken schnell und kontrolliert abschliessen. U9: 5, U12: 8, U15: 12, U18: 15 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Schuss-Serie', 'Mehrere Bälle nacheinander zügig aufs Tor schiessen. U9: 10, U12: 15, U15: 20, U18: 25 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Spitzer Winkel', 'Aus spitzem Winkel seitlich des Tors präzise abschliessen. U9: 6, U12: 10, U15: 14, U18: 18 Schüsse.', 'schuss', '{U9,U12,U15,U18}'),
  ('Schnellschuss', 'Ball ohne Vorbereitung sofort bei Annahme aufs Tor schiessen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Drehschuss', 'Nach einer schnellen Körperdrehung sofort aufs Tor schiessen. U9: 5, U12: 8, U15: 12, U18: 15 Wdh.', 'schuss', '{U9,U12,U15,U18}'),
  ('Präzisionsschuss', 'Auf kleine Ziele in den Torecken gezielt schiessen. U9: 8, U12: 12, U15: 16, U18: 20 Versuche.', 'schuss', '{U9,U12,U15,U18}'),

  ('Slalom-Dribbling', 'Ball eng am Schläger durch aufgestellte Hindernisse führen. U9: 2x, U12: 3x, U15: 4x, U18: 5x Strecke.', 'technik', '{U9,U12,U15,U18}'),
  ('Enge Ballführung', 'Ball mit kurzen, schnellen Schlägerkontakten eng kontrollieren. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'technik', '{U9,U12,U15,U18}'),
  ('Vor-Rückhand-Wechsel', 'Ball zügig zwischen Vorhand und Rückhand hin- und herführen. U9: 20, U12: 30, U15: 40, U18: 50 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Wandpass-Kontrolle', 'Ball an die Wand spielen und die Rückgabe kontrolliert annehmen. U9: 10, U12: 15, U15: 20, U18: 25 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Enge Kurven', 'Mit Ballführung enge Kurven und Richtungswechsel fahren. U9: 2x, U12: 3x, U15: 4x, U18: 5x Strecke.', 'technik', '{U9,U12,U15,U18}'),
  ('Ball anheben', 'Ball mit dem Schlägerblatt kontrolliert über ein Hindernis heben. U9: 5, U12: 8, U15: 12, U18: 15 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Finte/Deke', 'Mit Körper- und Schlägertäuschung an einem Hindernis vorbeiziehen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Kopf-hoch-Dribbling', 'Beim Ballführen den Kopf heben und nach vorne schauen. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'technik', '{U9,U12,U15,U18}'),
  ('Passgenauigkeit', 'Ball präzise auf ein markiertes Ziel an der Wand passen. U9: 10, U12: 15, U15: 20, U18: 25 Pässe.', 'technik', '{U9,U12,U15,U18}'),
  ('Ballannahme', 'Zugespielte Bälle sauber und ohne Abpraller kontrolliert annehmen. U9: 10, U12: 15, U15: 20, U18: 25 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Doppelpass', 'Im Laufen mit einem Partner Doppelpässe spielen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'technik', '{U9,U12,U15,U18}'),
  ('Rückwärts-Dribbling', 'Ball rückwärts laufend kontrolliert führen. U9: 20s, U12: 30s, U15: 40s, U18: 50s.', 'technik', '{U9,U12,U15,U18}'),
  ('Hindernis-Parcours', 'Ball durch enge Lücken zwischen Hindernissen manövrieren. U9: 2x, U12: 3x, U15: 4x, U18: 5x Strecke.', 'technik', '{U9,U12,U15,U18}'),
  ('Ballschutz', 'Ball mit dem Körper gegen einen Gegenspieler abschirmen. U9: 20s, U12: 30s, U15: 40s, U18: 50s.', 'technik', '{U9,U12,U15,U18}'),
  ('Dribbling+Schuss', 'Slalom-Dribbling direkt mit Torschuss abschliessen. U9: 4, U12: 6, U15: 8, U18: 10 Wdh.', 'technik', '{U9,U12,U15,U18}');
