<script lang="ts">
  import FormWrapper from '$components/FormWrapper.svelte';
</script>

<div class="md:grid flex-1 content-center">
  <FormWrapper>
    <slot />
  </FormWrapper>
</div>
