using UnityEngine;
using Fusion;
using System.Threading.Tasks;
using UnityEngine.SceneManagement;

public class NetworkManager : MonoBehaviour
{
    private NetworkRunner _runner;

    async void Start()
    {
        await StartGame(GameMode.AutoHostOrClient);
    }

    async Task StartGame(GameMode mode)
    {
        // Create the Fusion runner and let it know that we will be providing user input
        _runner = gameObject.AddComponent<NetworkRunner>();
        _runner.ProvideInput = true;

        // Start or join (depends on gamemode) a session with a specific name
        await _runner.StartGame(new StartGameArgs()
        {
            GameMode = mode,
            SessionName = "StoryForgeRoom",
            Scene = SceneManager.GetActiveScene().buildIndex,
            SceneManager = gameObject.AddComponent<NetworkSceneManagerDefault>()
        });
    }

    public void RequestAIGeneratedMission()
    {
        // Placeholder to fetch from the Node.js Backend API
        Debug.Log("Requesting AI Narrative Co-op Mission...");
    }
}
