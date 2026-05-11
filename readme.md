# CSC 2206 MACHINE LEARNING COURSE WORK

## Project Details

**Project Title:** CoCIS Real-Time Customer Care Service Voice Assistant 

**Group Code:** SW-ML-1

**Supervisor**: [Ggaliwango Marvin](https://www.linkedin.com/in/ggaliwango-marvin-1515b7122/)

**Model Training Notebook(Google Colab)**: TODO

**Inference Notebook**: [https://colab.research.google.com/drive/1jIyoFqOsaM_kGngYK7WgmjnWNVzOGxMP?usp=sharing](https://colab.research.google.com/drive/1jIyoFqOsaM_kGngYK7WgmjnWNVzOGxMP?usp=sharing)

**Dataset**: [https://huggingface.co/datasets/jimjunior/cocis-web-info](https://huggingface.co/datasets/jimjunior/cocis-web-info)

**Application API Docker Image**: `jimjuniorb/cmva`

**Application UI Endpoint**: [https://cmva.open.ug](https://cmva.open.ug)

### Team Members

| Name                | Student Number | Registration Number | Student Email                                                                           | University Affiliation |
| ------------------- | -------------- | ------------------- | --------------------------------------------------------------------------------------- | ---------------------- |
| Beingana Jim Junior | 2200705243     | 22/X/5243/PS        | [beingana.jim.junior@students.mak.ac.ug](mailto:beingana.jim.junior@students.mak.ac.ug) | Makerere University    |
| Akol Paul           | 2200722453     | 22/U/22453          | [akol.paul@students.mak.ac.ug](mailto:simon.mujuni@students.mak.ac.ug)                  | Makerere University    |


## Project Overview

CoCIS Real-Time Customer Care Service Voice Assistant is an AI-powered voice agent designed to serve students,Parents, staff, and visitors of the College of Computing and Information Sciences (CoCIS) at Makerere University in Uganda. The assistant is built to handle customer care inquiries through natural spoken language across multiple Ugandan languages, making it accessible to a diverse user base that may not be comfortable communicating in English alone.
The core challenge the project addresses is language inclusivity most existing voice assistants are English-only, leaving out millions of Ugandan speakers of languages like Acholi, Luganda, Lugbara, Ateso, Runyankole, and Swahili. This assistant bridges that gap by supporting real-time voice selection and multilingual response generation.
The project leverages the Sunbird AI SALT (Speech Annotations for Low-resource Transcription) dataset, a parallel speech corpus of 24,933 audio recordings across 7 Ugandan languages recorded in studio quality conditions. The dataset serves as the foundation for training the language identification, speech recognition, and voice synthesis components of the assistant.

The end goal is a deployable voice agent that can:

1. Detect which language a user is speaking
2. Transcribe and understand their query
3. Respond in the same language with a natural synthesized voice
4. Handle common CoCIS customer care tasks such as course inquiries, registration help, and departmental information, Tuition inquiries etc

