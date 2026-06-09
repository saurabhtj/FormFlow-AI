using UnityEngine;
using UnityEngine.SceneManagement;

public class BGMManager : MonoBehaviour
{
    public static BGMManager Instance;

    public AudioSource musicSource;

    public AudioClip openingBGM;
    public AudioClip lobbyBGM;
    public AudioClip startBGM;
    public AudioClip gameplayBGM;
    public AudioClip closedBGM;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }

        SceneManager.sceneLoaded += OnSceneLoaded;
    }

    void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        switch(scene.name)
        {
            case "Opening":
                PlayMusic(openingBGM);
                break;

            case "Lobby":
                PlayMusic(lobbyBGM);
                break;

            case "Starting":
                PlayMusic(startBGM);
                break;

            case "Game":
                PlayMusic(gameplayBGM);
                break;

            case "Closed":
                PlayMusic(closedBGM);
                break;
        }
    }

    public void PlayMusic(AudioClip clip)
    {
        if(musicSource.clip == clip)
            return;

        musicSource.clip = clip;
        musicSource.loop = true;
        musicSource.Play();
    }
}
