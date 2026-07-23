-- Seed-Übungen für die Kategorien "Kondition" und "Schnelligkeit".
-- Jede Übung gilt für alle vier Altersgruppen (U9/U12/U15/U18); die
-- altersabhängige Dauer/Wiederholungszahl steht direkt im Beschreibungstext,
-- da das Schema keine separaten Werte pro Altersgruppe vorsieht. Kein Bild
-- vorhanden (bild_url/video_url bleiben leer), kein bestimmter Ersteller
-- (erstellt_von bleibt leer).

insert into public.uebungen (titel, beschreibung, kategorie, altersgruppen)
values
  ('Laufen auf Stelle', 'Auf der Stelle joggen, Knie leicht anheben, Arme mitschwingen. U9: 1 Min, U12: 2 Min, U15: 3 Min, U18: 4 Min.', 'kondition', '{U9,U12,U15,U18}'),
  ('Kniehebelauf', 'Im Laufschritt die Knie hoch zur Hüfte ziehen, zügiges Tempo halten. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'kondition', '{U9,U12,U15,U18}'),
  ('Anfersen', 'Im Laufschritt die Fersen Richtung Gesäss schlagen. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'kondition', '{U9,U12,U15,U18}'),
  ('Burpees', 'Aus dem Stand in die Liegestütz-Position fallen, aufdrücken, hochspringen. U9: 5, U12: 8, U15: 12, U18: 16 Wdh.', 'kondition', '{U9,U12,U15,U18}'),
  ('Bergsteiger', 'Unterarmstütz, Knie abwechselnd schnell zur Brust ziehen. U9: 20, U12: 30, U15: 40, U18: 50 Wdh.', 'kondition', '{U9,U12,U15,U18}'),
  ('Strecken-Sprint', 'Über eine feste Strecke (z.B. Wohnzimmer) locker hin- und zurücklaufen. U9: 3x, U12: 5x, U15: 7x, U18: 9x.', 'kondition', '{U9,U12,U15,U18}'),
  ('Seitliches Pendeln', 'Seitlich zwischen zwei Punkten fortlaufend hin- und herlaufen. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'kondition', '{U9,U12,U15,U18}'),
  ('Treppenintervalle', 'Treppe im Wechsel zügig hoch, langsam runter, mehrere Runden. U9: 3 Runden, U12: 5, U15: 7, U18: 9 Runden.', 'kondition', '{U9,U12,U15,U18}'),
  ('Schattenboxen', 'Im Stand fortlaufend Boxschläge in die Luft schlagen. U9: 30s, U12: 45s, U15: 60s, U18: 90s.', 'kondition', '{U9,U12,U15,U18}'),
  ('Seitsprünge', 'Seitlich über eine Linie am Boden fortlaufend hin- und herspringen. U9: 20, U12: 30, U15: 40, U18: 50 Wdh.', 'kondition', '{U9,U12,U15,U18}'),
  ('Kissenlauf', 'Um ein Kissen/Gegenstand im Raum im Dauerlauf-Tempo Runden drehen. U9: 1 Min, U12: 2 Min, U15: 3 Min, U18: 4 Min.', 'kondition', '{U9,U12,U15,U18}'),
  ('Dauerseilspringen', 'Mit Seil/Wäscheleine am Stück möglichst lange durchgehend springen. U9: 30s, U12: 60s, U15: 90s, U18: 120s.', 'kondition', '{U9,U12,U15,U18}'),
  ('Kniebeugen-Pulse', 'Kniebeugen zügig und ohne Pause im flotten Tempo wiederholen. U9: 15, U12: 25, U15: 35, U18: 45 Wdh.', 'kondition', '{U9,U12,U15,U18}'),
  ('Leinen-Pendellauf', 'Zwischen zwei markierten Punkten fortlaufend hin- und herlaufen. U9: 4x, U12: 6x, U15: 8x, U18: 10x.', 'kondition', '{U9,U12,U15,U18}'),
  ('Ausdauer-Zirkel', 'Hampelmann, Kniehebe- und Fersenlauf im Wechsel ohne Pause durchführen. U9: 1 Min, U12: 2 Min, U15: 3 Min, U18: 4 Min.', 'kondition', '{U9,U12,U15,U18}'),

  ('Stellensprint', 'Maximal schnelle Laufbewegung auf der Stelle für kurze Zeit. U9: 10s, U12: 15s, U15: 20s, U18: 25s.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Antrittssprints', 'Kurze, kraftvolle Sprints über wenige Meter mit Stopp. U9: 4x, U12: 6x, U15: 8x, U18: 10x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Schnelle Kniehebe', 'Kniehebe im höchstmöglichen Tempo für kurze Intervalle. U9: 10s, U12: 15s, U15: 20s, U18: 25s.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Reaktionsstart', 'Aus Sitz oder Liegen auf Zuruf blitzschnell aufspringen und loslaufen. U9: 5x, U12: 8x, U15: 10x, U18: 12x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Tempowechsel', 'Abwechselnd langsames und maximal schnelles Lauftempo auf der Stelle. U9: 6x, U12: 8x, U15: 10x, U18: 12x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Schnell-Seitsprünge', 'Seitlich so schnell wie möglich über eine Linie hin- und herspringen. U9: 10s, U12: 15s, U15: 20s, U18: 25s.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Ball-Reaktionssprint', 'Ball fallen lassen, so schnell wie möglich fangen bevor er zweimal aufkommt. U9: 5x, U12: 8x, U15: 10x, U18: 12x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Hampelmann-Sprint', 'Hampelmann im maximal möglichen Tempo für kurze Zeit. U9: 10s, U12: 15s, U15: 20s, U18: 25s.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Klatsch-Liegestütz', 'Liegestütz mit explosivem Abdruck und Klatschen in die Hände. U9: 3, U12: 5, U15: 8, U18: 10 Wdh.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Sprint-Slalom', 'Möglichst schnell im Slalom um Gegenstände laufen. U9: 2x, U12: 3x, U15: 4x, U18: 5x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Treppen-Sprint', 'Die ersten Treppenstufen so schnell wie möglich hochsprinten. U9: 3x, U12: 5x, U15: 7x, U18: 9x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Seilsprint', 'Seilspringen im maximal möglichen Tempo für kurze Intervalle. U9: 10s, U12: 15s, U15: 20s, U18: 25s.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Richtungswechsel', 'Auf Zuruf oder Handzeichen sofort die Laufrichtung wechseln. U9: 6x, U12: 8x, U15: 10x, U18: 12x.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Sprung-Kniebeuge', 'Aus der Kniebeuge so schnell wie möglich explosiv hochspringen. U9: 6, U12: 10, U15: 14, U18: 18 Wdh.', 'schnelligkeit', '{U9,U12,U15,U18}'),
  ('Reaktionsfang', 'Gegenstand fallen lassen und so schnell wie möglich mehrfach auffangen. U9: 5x, U12: 8x, U15: 10x, U18: 12x.', 'schnelligkeit', '{U9,U12,U15,U18}');
