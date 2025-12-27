
import { GoogleGenAI, Type } from "@google/genai";
import { Mission, TileType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMission(level: number): Promise<Mission> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a challenging Battle City style tank mission for Level ${level}. 
    The grid size is 13x13. 
    Represent the grid as a 2D array where:
    0 = Empty
    1 = Brick (Destructible)
    2 = Steel (Indestructible)
    3 = Water (Tanks can't cross, bullets can)
    4 = Bush (Hides tanks)
    9 = Base (Eagle to protect, place at bottom center at grid[12][6])

    Player starts at grid[12][4]. Enemies spawn at grid[0][0], grid[0][6], grid[0][12].
    
    Return a JSON object with:
    - name: A cool mission name.
    - description: A short tactical briefing.
    - grid: The 13x13 2D array of numbers.
    - enemyCount: Number of enemies to defeat (suggest between 3 and 8).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          grid: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER } 
            } 
          },
          enemyCount: { type: Type.NUMBER }
        },
        required: ["name", "description", "grid", "enemyCount"]
      }
    }
  });

  try {
    const mission = JSON.parse(response.text) as Mission;
    // Ensure base and player start are valid
    mission.grid[12][6] = TileType.BASE;
    return mission;
  } catch (e) {
    console.error("Failed to parse mission", e);
    return createDefaultMission(level);
  }
}

function createDefaultMission(level: number): Mission {
  const grid = Array(13).fill(0).map(() => Array(13).fill(TileType.EMPTY));
  // Simple border
  for(let i=0; i<13; i++) {
    grid[5][i] = (i % 3 === 0) ? TileType.STEEL : TileType.BRICK;
  }
  grid[12][6] = TileType.BASE;
  
  return {
    name: `Default Operation ${level}`,
    description: "The AI failed to brief you. Standard combat protocols engaged.",
    grid,
    enemyCount: 4 + level
  };
}
