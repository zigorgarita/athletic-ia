const fetch = require('node-fetch');

async function testRoleCards() {
  const payload = {
    message: "Genera las fichas",
    actionType: "generateLineTasks",
    context: {
      systemOwn: "1-3-5-2",
      systemRival: "1-4-3-3",
      systemNodes: ["POR", "DCD", "CT", "DCI", "CAD", "MCD", "MC", "CAI", "MCO", "SD", "DC"],
      assignedPlayerIds: ["player1", "player2", "player3", "player4", "player5", "player6", "player7", "player8", "player9", "player10", "player11"],
      matchupId: "test-matchup",
      matchId: "test-match",
    },
    conversationHistory: []
  };

  console.log("Enviando petición a la IA Táctica con sistema 1-3-5-2 y 11 posiciones complejas...");
  
  try {
    const response = await fetch('http://localhost:3000/api/tactical-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-passkey': 'indautxu2026'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("Error HTTP:", response.status);
      const errText = await response.text();
      console.error(errText);
      return;
    }

    const data = await response.json();
    console.log("Respuesta de la IA (fragmento inicial):\\n", data.content.substring(0, 500) + "...\\n");
    
    const roleCards = data.suggestedActions?.find(a => a.type === 'apply_to_role_card')?.data?.roleCards;
    
    if (!roleCards) {
      console.error("No se extrajeron roleCards de la respuesta.");
      return;
    }

    console.log(`Se han extraído ${roleCards.length} fichas de rol.`);
    
    let allValid = true;
    for (const pos of payload.context.systemNodes) {
      const card = roleCards.find(c => c.posicion_label === pos);
      if (!card) {
        console.error(`FALTA LA FICHA PARA LA POSICIÓN: ${pos}`);
        allValid = false;
      } else {
        console.log(`✅ Ficha para ${pos} - Línea detectada: ${card.linea}`);
        console.log(`   Ofensiva: ${card.fase_ofensiva.substring(0, 30)}...`);
        console.log(`   Defensiva: ${card.fase_defensiva.substring(0, 30)}...`);
      }
    }

    if (allValid && roleCards.length === 11) {
      console.log("\\n¡PRUEBA SUPERADA! Las 11 fichas se han generado y extraído correctamente con líneas dinámicas.");
    } else {
      console.error("\\nPRUEBA FALLIDA. Revisa los logs.");
    }

  } catch (err) {
    console.error("Error ejecutando la prueba:", err);
  }
}

testRoleCards();
