using UnityEngine;

public class CombatMusicController : MonoBehaviour
{
    public AudioSource musicSource;

    public AudioClip explorationMusic;
    public AudioClip combatMusic;

    bool inCombat;

    public void EnterCombat()
    {
        if(inCombat) return;

        inCombat = true;

        musicSource.clip = combatMusic;
        musicSource.Play();
    }

    public void ExitCombat()
    {
        inCombat = false;

        musicSource.clip = explorationMusic;
        musicSource.Play();
    }
}
